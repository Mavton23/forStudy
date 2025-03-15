require('dotenv').config()
const fs = require('fs/promises')
const markdownIt = require('markdown-it')
const upload = require('../../server')
const chunkArray = require('../utils/lotes')

const express = require('express')
const router = express.Router()

// MODELS
const { sequelize } = require('../models/db')
const { BrainArea, Brain, BrainSection } = require('../models/Model')
const { checkLogin, checkAdmin } = require('../configs/passport')

router.get('/dashboard', checkLogin, checkAdmin, async (req, res) => {
    const areas = await BrainArea.findAll()
    const subjects = await Brain.findAll()
    const numberOfAreas = await BrainArea.count()
    const numberOfSubjects = await Brain.count()
    const numberOfSections = await BrainSection.count()
    let areasMapped = areas.map(area => area.toJSON())
    let subjectsMapped = subjects.map(subject => subject.toJSON())

    res.render('dashboard', { areas: areasMapped, subjects: subjectsMapped, numberOfAreas, numberOfSubjects, numberOfSections })
})

router.get('/newtopic', checkLogin, checkAdmin, (req, res) => {
    res.render('topicForm')
})

router.post('/newtopic', checkLogin, checkAdmin, upload.single('file'), async (req, res) => {
    let transaction
    
    try {
        const { inputMode, area, subject, subtitles, contents } = req.body;

        if (inputMode === 'manual') {
            if (!area || !subject || !Array.isArray(subtitles) || !Array.isArray(contents)) {
                return res.render('topicForm', { error: 'Dados inválidos. Tente novamente.' });                
            }

            if (subtitles.length !== contents.length) {
                return res.render('topicForm', { error: 'Subtítulos e conteúdos devem ter o mesmo número de itens.' })
            }

            const transaction = await sequelize.transaction()

            // Lógica para salvar manualmente
            const areas = await BrainArea.create({ area }, { transaction });
            const topic = await Brain.create({ 
                subject ,
                brainAreaId: areas.id
            }, { transaction });

            const sections = subtitles.map((subtitle, index) => ({
                brainId: topic.id,
                subtitle,
                content: contents[index],
            }))

            await BrainSection.bulkCreate(sections, { transaction })

            await transaction.commit();

            return res.render('topicForm', { success: 'Topico criado com sucesso!' });
        } else if (inputMode === 'upload' && req.file) {

            if (!req.file) {
                return res.render('topicForm', { error: 'Nenhum ficheiro recebido!' })
            }

            const transaction = await sequelize.transaction()
            
            try {
                // Lê o arquivo
                const filePath = req.file.path;
                const rawMarkdown = await fs.readFile(filePath, 'utf-8');
                const topicData = parseMarkdown(rawMarkdown);

                if (!topicData.area || !topicData.title) {
                    throw new Error('O arquivo precisa ter uma área e um título!');
                }

                // Criar ou buscar a área
                let [area] = await BrainArea.findOrCreate({
                    where: { area: topicData.area },
                    transaction
                });

                // Criar o tópico associado à área
                const topic = await Brain.create({
                    subject: topicData.title,
                    brainAreaId: area.id
                }, { transaction });

                // Criar as seções associadas ao tópico
                const sections = topicData.sections.map(section => ({
                    brainId: topic.id,
                    subtitle: section.subtitle,
                    content: section.content,
                }));

                // Inserção em lotes para melhor performance
                const BATCH_SIZE = 200;
                const sectionsChunks = chunkArray(sections, BATCH_SIZE);
                for (const chunk of sectionsChunks) {
                    await BrainSection.bulkCreate(chunk, { transaction });
                }

                await transaction.commit();
                await fs.unlink(filePath);

                return res.render('topicForm', { success: 'Tópico criado com sucesso via upload!' });
            } catch (error) {
                console.log("Erro no processamento: ", error)
            }
        } 
    } catch (error) {
        if(transaction) {
            await transaction.rollback();
        }
        console.error(error);
        return res.render('topicForm', { error: 'Erro ao criar o topico: ' + error.message });
    }
});

function parseMarkdown(rawMarkdown) {
    const md = new markdownIt();
    const tokens = md.parse(rawMarkdown, {});
    const topicData = { area: '', title: '', sections: [] };

    let currentSection = null;

    tokens.forEach((token, index) => {
        if (token.type === 'heading_open' && token.tag === 'h1') {
            // Captura a área do livro
            const nextToken = tokens[index + 1];
            if (nextToken && nextToken.type === 'inline') {
                topicData.area = nextToken.content;
            }
        } else if (token.type === 'heading_open' && token.tag === 'h2') {
            // Captura o título do livro
            const nextToken = tokens[index + 1];
            if (nextToken && nextToken.type === 'inline') {
                topicData.title = nextToken.content;
            }
        } else if (token.type === 'heading_open' && token.tag === 'h3') {
            // Inicia uma nova seção
            if (currentSection) {
                topicData.sections.push({ ...currentSection });
            }
            currentSection = { subtitle: '', content: '', keywords: [] };

            const nextToken = tokens[index + 1];
            if (nextToken && nextToken.type === 'inline') {
                currentSection.subtitle = nextToken.content;
            }
        } else if (token.type === 'paragraph_open' && currentSection) {
            const nextToken = tokens[index + 1];
            if (nextToken && nextToken.type === 'inline') {
                if (nextToken.content.startsWith('Keywords:')) {
                    currentSection.keywords = nextToken.content.replace('Keywords:', '').split(',').map(k => k.trim());
                } else {
                    currentSection.content += `${nextToken.content}\n`;
                }
            }
        }
    });

    // Adiciona a última seção ao array
    if (currentSection) {
        topicData.sections.push({ ...currentSection });
    }

    return topicData;
}

router.get('/deletetopic', checkLogin, checkAdmin, async (req, res) => {
    try {
        const areas = await BrainArea.findAll()
        const subjects = await Brain.findAll()
        let areasMapped = areas.map(area => area.toJSON())
        let subjectsMapped = subjects.map(subject => subject.toJSON())

        res.render('deleteTopic', { areas: areasMapped, subjects: subjectsMapped })
        
    } catch (error) {
        console.log('Erro: ', error instanceof Error ? error.message : error)
        res.status(500).send('Erro interno no servidor')
    }
})
router.get('/deletetopic/:id', checkLogin, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new Error("Invalid ID received")
        }
        const tryInAreas = await BrainArea.findOne({
            where: {
                id: id
            }
        })

        const tryInSubjects = await Brain.findOne({
            where: {
                id: id
            }
        })

        if (tryInAreas) {
            BrainArea.destroy({
                where: {
                    id: id
                }
            })
            res.redirect('/admin/deletetopic')
        } else if (tryInSubjects) {
            Brain.destroy({
                where: {
                    id: id
                }
            })
            res.redirect('/admin/deletetopic')
        }

    } catch (error) {
        console.log("Error: ", error instanceof Error ? error.message : error)
    }
})

router.get('/denied', (req, res) => {
    res.render('denied')
})

module.exports = router;
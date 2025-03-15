require('dotenv').config()

const { QueryTypes, Op, fn, col, literal } = require('sequelize')
const { sequelize } = require('../models/db')
const express = require('express')
const router = express.Router()

const { checkLogin, checkAdmin } = require('../configs/passport')

// MODELS
const { Brain, BrainSection, UserHistory } = require('../models/Model')

router.get('/:userId/:area', checkLogin, async (req, res) => {
    try {
        const { userId, area } = req.params;
        const searchedQuestion = req.query.search

        let history

        if (searchedQuestion) {
            history = await UserHistory.findAll({
                where: {
                    userId: userId,
                    question: searchedQuestion
                }
            })
        } else {
            history = await UserHistory.findAll({ where: { userId: userId } })
        }

        const mappedHistory = history.map(hist => ({
            id: hist.id,
            userId: hist.userId,
            question: hist.question,
            answer: hist.answer
        }))

        res.render('search', { history: mappedHistory, title: "forStudy | Search" })
    } catch (error) {
        console.log("ERRO: " + error)
    }
})
// Ao clicar em item do historico ele e procurado denovo no banco de dados e retornado
router.get('/history', checkLogin,  async (req, res) => {
    const userId =  req.session.userId
    const question = req.query.query

    try {
        const history = await UserHistory.findOne({
            where: {
                userId: userId,
                question: question
            }
        })

        if (history) {
            const results = history.answer
            res.json({ results })
        } else {
            res.status(404).json({ error: 'Nenhum histórico encontrado para essa consulta.' });
        }

    } catch (error) {
        console.error('Erro ao buscar o histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar o histórico.' });
    }
})

// Rota que processa as perguntas e retorna a resposta
router.post('/getcorrespondence/:area', async (req, res) => {
    const { question } = req.body;
    const userId = req.session.userId;
    const { area } = req.params;

    if (!question || !area) {
        return res.status(400).json({ error: 'Por favor, insira uma pergunta.' });
    }

    try {
        const existingHistory = await UserHistory.findOne({
            where: {
                userId,
                question: {
                    [Op.like]: `%${question}%`,
                },
            },
        });

        if (existingHistory) {
            return res.json({
                question: existingHistory.question,
                response: existingHistory.response
            })
        }

        const relevantSections = await sequelize.query(
            `SELECT bs.subtitle, bs.content, b.subject AS brainSubject,
                MATCH(bs.subtitle, bs.content) AGAINST(:question IN NATURAL LANGUAGE MODE) AS relevance
             FROM BrainSections bs
             JOIN Brains b ON b.id = bs.brainId
             JOIN BrainAreas ba ON ba.id = b.brainAreaId
             WHERE ba.area = :area
               AND MATCH(bs.subtitle, bs.content) AGAINST(:question IN NATURAL LANGUAGE MODE)
             ORDER BY relevance DESC
             LIMIT 2;`,
            {
                replacements: { question, area },
                type: QueryTypes.SELECT,
            }
        );

        // console.log(relevantSections)


        if (!relevantSections.length) {
            return res.status(404).json({
                error: 'Nenhuma resposta encontrada para sua pergunta.',
            });
        }


        const results = relevantSections.map((section) => ({
            brainsubject: section.brainSubject,
            subtitle: section.subtitle,
            content: truncateContent(section.content, question),
        }));


        // Combinar subtítulos e conteúdos em uma resposta formatada
        const answer = results
            .map(
                (result) =>
                    `Fonte: ${result.brainsubject}<br>Subtítulo: ${result.subtitle || 'Sem subtítulo'}<br>Trecho: ${
                        result.content
                    }`
            )
            
            .join('<br>---<br>');
        
        await UserHistory.create({
            userId,
            question,
            answer,
        });

        return res.json({ question, answer });

    } catch (error) {
        console.error('Erro ao processar a pergunta:', error);
        return res.status(500).json({
            error: 'Erro ao processar a pergunta. Tente novamente mais tarde.',
        });
    }
})

function truncateContent(content, question) {
    const regex = new RegExp(`.{0,100}${question}.{0,100}`, 'i'); 
    const match = content.match(regex);
    return match ? match[0] : content.substring(0, 5000) + '...';
}

module.exports = router;
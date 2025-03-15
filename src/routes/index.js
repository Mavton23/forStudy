const express = require('express');
const router = express.Router();
const { User, BrainArea } = require('../models/Model');


// Rota 1
router.get('/', async (req, res) => {
    try {

        const userId = req.session.userId
        let user = null
        let currentYear = new Date().getFullYear()

        if (userId) {
            const checkuser = await User.findByPk(userId)
            user = checkuser ? checkuser.toJSON() : null
        }

        // Areas
        const areas = await BrainArea.findAll()
        const areasContent = areas.map(area => area.toJSON())

        res.render('index', { user, currentYear, areas: areasContent, title: "forStudy | Nordino Mavie Dev" });
    }
    catch (error) {
        console.log(error)
        res.status(500).send('Erro interno no servidor');
    }
})

module.exports = router;
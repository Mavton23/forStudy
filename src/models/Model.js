const db = require('./db')
const { v4:uuid4 } = require('uuid')
const { DataTypes } = require('sequelize')
const bcrypt = require('bcrypt')

const User = db.sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuid4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, {
    timestamps: true
})

User.beforeCreate(async (user) => {
    if (user.password) {
        const hash = await bcrypt.hash(user.password, 12)
        user.password = hash
    }
})

const BrainArea = db.sequelize.define('BrainArea', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuid4,
        primaryKey: true
    },
    area: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
})

const Brain = db.sequelize.define('Brain', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuid4,
        primaryKey: true
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    brainAreaId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: BrainArea,
            key: 'id'
        }
    }
})

const BrainSection = db.sequelize.define('BrainSection', {
    id: {
        type: DataTypes.UUID,
        defaultValue: uuid4,
        primaryKey: true
    },
    brainId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Brain,
            key: 'id'
        }
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
}, {
    indexes: [
        {
            type: 'FULLTEXT',
            fields: ['subtitle', 'content']
        }
    ]
})

const UserHistory = db.sequelize.define('UserHistory', {
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    question: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    answer: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    }
})

BrainArea.hasMany(Brain, { foreignKey: 'brainAreaId', as: 'brains', onDelete: 'CASCADE' })
Brain.belongsTo(BrainArea, { foreignKey: 'brainAreaId', as: 'brainArea' })

Brain.hasMany(BrainSection, { foreignKey: 'brainId', onDelete: 'CASCADE' })
BrainSection.belongsTo(Brain, { foreignKey: 'brainId' })

UserHistory.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' })
User.hasMany(UserHistory, { foreignKey: 'userId', onDelete: 'CASCADE' })



module.exports = {
    User,
    BrainArea,
    Brain,
    BrainSection,
    UserHistory
}
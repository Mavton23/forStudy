const { User, Brain, BrainSection, UserHistory } = require('../models/Model');

async function clearDatabase() {
    await User.destroy({ truncate: true, cascade: true, restartIdentity: true });
    await Brain.destroy({ truncate: true, cascade: true, restartIdentity: true });
    await BrainSection.destroy({ truncate: true, cascade: true, restartIdentity: true });
    await UserHistory.destroy({ truncate: true, cascade: true, restartIdentity: true });

    console.log('Todas as tabelas foram esvaziadas.');
}

clearDatabase();

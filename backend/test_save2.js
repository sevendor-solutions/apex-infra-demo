require('reflect-metadata');
const sequelize = require('./dist/config/database').default;
const { DailyAgendaMatrix } = require('./dist/models/DailyAgendaMatrix');

async function test() {
  try {
    await sequelize.authenticate();
    const matrix = await DailyAgendaMatrix.findByPk('main_daily_matrix');
    const oldChecklists = matrix.cellChecklists;
    console.log('Old keys count:', Object.keys(oldChecklists).length);

    // Modify cellChecklists
    const newChecklists = { ...oldChecklists, '2026-09-22__test': [{ id: 'test_1', title: 'test', completed: false }] };
    matrix.cellChecklists = newChecklists;
    console.log('matrix.changed():', matrix.changed());
    await matrix.save();

    // Reload from DB fresh
    const reloaded = await DailyAgendaMatrix.findByPk('main_daily_matrix');
    console.log('Reloaded keys count:', Object.keys(reloaded.cellChecklists).length);
    console.log('Has test key?', '2026-09-22__test' in reloaded.cellChecklists);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}
test();

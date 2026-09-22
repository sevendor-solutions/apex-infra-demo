require('reflect-metadata');
const sequelize = require('./dist/config/database').default;
const { DailyAgendaMatrix } = require('./dist/models/DailyAgendaMatrix');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const matrix = await DailyAgendaMatrix.findByPk('main_daily_matrix');
    console.log('Found matrix:', matrix ? matrix.title : 'null');
    if (matrix) {
      console.log('Columns in DB:', matrix.columns ? matrix.columns.length : 0);
      const keys = Object.keys(matrix.cellChecklists || {});
      console.log('Keys count:', keys.length);
      
      // Let's test modifying and saving
      matrix.title = 'Daily Construction Follow-up Matrix';
      await matrix.save();
      console.log('Saved successfully');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}
test();

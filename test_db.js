const ADODB = require('node-adodb');
const connection = ADODB.open('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=C:\\Users\\Pratik.Patel\\Downloads\\SETUP\\SETUP\\villagedb\\THEVILLAGE.accdb;Mode=Share Deny None;Persist Security Info=False;', true);

async function testConnection() {
  try {
    const columns = await connection.schema(4); // 4 = adSchemaColumns
    const tables = {};
    for (const col of columns) {
      if (['Volunteers', 'volunteerHours', 'Items'].includes(col.TABLE_NAME)) {
        if (!tables[col.TABLE_NAME]) tables[col.TABLE_NAME] = [];
        tables[col.TABLE_NAME].push({ name: col.COLUMN_NAME, type: col.DATA_TYPE });
      }
    }
    console.log(JSON.stringify(tables, null, 2));
  } catch (error) {
    console.error("Error retrieving schema:", error);
  }
}
testConnection();

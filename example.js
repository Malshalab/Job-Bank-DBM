// Required modules
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const app = express();

// Enable CORS middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500'); // Replace with your frontend URL
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200); // Respond to OPTIONS requests with a 200 status
  } else {
    next(); // Continue processing other requests
  }
});




// Connection pool configuration for Oracle DB
const dbConfig = {
  user: "admin",
  password: "Milan!200919",
  connectionString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.ca-toronto-1.oraclecloud.com))(connect_data=(service_name=gd93372dce41e3b_mytestdb_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
};


// Function to interact with Oracle DB and create a table
async function createTable(tableName, columns) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Check if the table already exists
    const checkTableSQL = `SELECT table_name FROM user_tables WHERE table_name = '${tableName.toUpperCase()}'`;
    const existingTable = await connection.execute(checkTableSQL);

    // If the table exists, drop it
    if (existingTable.rows.length > 0) {
      const dropTableSQL = `DROP TABLE ${tableName}`;
      await connection.execute(dropTableSQL);
    }

    // Construct column definitions in the format 'column_name data_type'
    const columnsDefinition = columns.join(', ');

    // Create the SQL query for table creation
    const createTableSQL = `CREATE TABLE ${tableName} (${columnsDefinition})`;

    // Execute the SQL query to create the table
    await connection.execute(createTableSQL);

    return true; // Table creation success
  } catch (error) {
    console.error(error);
    return false; // Table creation failed
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}


// Route handling POST request to create table
app.post('/createTable', (req, res) => {
  const { tableName, columns } = req.body;
  // Check if tableName and columns exist in req.body
  if (!tableName || !columns) {
    return res.status(400).send('Invalid request: tableName and columns are required');
  }

  try {
    const tableCreationResult = await createTable(tableName, columns);
    if (tableCreationResult) {
      console.log('Table created successfully!');
      res.status(200).json({ success: true });
    } else {
      console.log('Table creation failed.');
      res.status(500).json({ success: false, message: 'Table creation failed' });
    }
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Define an async function to use await
async function createAndCheckTable() {
  const userProvidedTableName = 'DynamicTable'; // Replace with your dynamic table name
  const userProvidedColumns = [
    'id NUMBER',
    'name VARCHAR2(50)',
    'date_of_birth DATE',
    // Add more columns as needed
  ];
  try {
    const tableCreationResult = await createTable(userProvidedTableName, userProvidedColumns);
    if (tableCreationResult) {
      console.log('Table created successfully!');
    } else {
      console.log('Table creation failed.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Call the async function
createAndCheckTable();

async function runApp() {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: "admin",
      password: "Milan!200919",
      connectionString: "(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1521)(host=adb.ca-toronto-1.oraclecloud.com))(connect_data=(service_name=gd93372dce41e3b_mytestdb_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))"
    });

    // If the table does not exist, create it
    const tableExistsQuery = `SELECT table_name FROM user_tables WHERE table_name = 'COMPANY'`;
    const tableExistsResult = await connection.execute(tableExistsQuery);

    if (tableExistsResult.rows.length === 0) {
      await connection.execute(`
        CREATE TABLE Company (
          CompanyID NUMBER PRIMARY KEY,
          CEOName VARCHAR2(255),
          DateFounded DATE,
          NumEmployees NUMBER,
          Industry VARCHAR2(255)
        )
      `);
      // Commit the table creation
      await connection.commit();
    }

    // Perform a SELECT query
    const companyResult = await connection.execute(`SELECT * FROM Company`);
    
    // Extract the rows and return them
    const allCompanyRows = companyResult.rows || [];

    console.log('Fetched company data:', allCompanyRows);
    return { companyData: allCompanyRows };
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
  }
}

app.get('/companies/search', async (req, res) => {
  const companyName = req.query.name;
  try {
    const searchResults = await searchCompaniesByName(companyName);
    res.json(searchResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function searchCompaniesByName(name) {
  // Logic to search for companies by name in the database
  // Perform a database query using the provided company name (CompanyName field)
  // For example:
  const query = `SELECT * FROM Company WHERE CompanyName LIKE '%${name}%'`;
  const searchResults = await performDatabaseQuery(query); // Use your database query method
  return searchResults;
}

// Route to handle GET requests for fetching company data
app.get('/companies', async (req, res) => {
  try {
    const data = await runApp(); // Fetch data using runApp() function
    res.json(data); // Send the fetched rows as JSON to the frontend
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST endpoint to handle company insertion
app.post('/companies', async (req, res) => {
  const companyData = req.body;
  try {
    // Validate companyData and perform database insertion
    await insertCompanyIntoDB(companyData);
    res.status(201).send('Company inserted successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to insert company');
  }
});

// Function to insert company data into Oracle DB
async function insertCompanyIntoDB(companyData) {
  const { CompanyID, CEOName, DateFounded, NumEmployees, Industry } = companyData;
  const sql = `INSERT INTO Company (CompanyID, CEOName, DateFounded, NumEmployees, Industry) VALUES (:1, :2, TO_DATE(:3, 'YYYY-MM-DD'), :4, :5)`;

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(sql, [
      CompanyID, // Value for :1 placeholder
      CEOName, // Value for :2 placeholder
      DateFounded, // Value for :3 placeholder
      NumEmployees, // Value for :4 placeholder
      Industry // Value for :5 placeholder
    ]);
    await connection.commit();
  } catch (error) {
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

// ... (existing code)

app.post('/dropTable', async (req, res) => {
  const { tableName } = req.body;

  try {
    const success = await dropTable(tableName);

    if (success) {
      res.sendStatus(200); // Send success response
    } else {
      res.status(500).send('Table drop failed.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Table drop failed.');
  }
});

async function dropTable(tableName) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const dropTableSQL = `DROP TABLE ${tableName}`;
    await connection.execute(dropTableSQL);

    return true; // Table drop success
  } catch (error) {
    console.error(error);
    return false; // Table drop failed
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}



// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




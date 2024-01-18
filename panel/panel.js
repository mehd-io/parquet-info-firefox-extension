const duckdb = await import("https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28/+esm");

console.log(duckdb.PACKAGE_VERSION);

const bundles = duckdb.getJsDelivrBundles();
const bundle = await duckdb.selectBundle(bundles);

// Function to create and initialize the DuckDB database.
async function makeDB() {
  const logger = new duckdb.ConsoleLogger();
  const worker = await duckdb.createWorker(bundle.mainWorker);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule);
  return db
}

// Creating the DuckDB database instance.
const db = await makeDB();

console.log(await db.getVersion());

// Establishing a connection to the DuckDB database.
const conn = await db.connect();

// Setting the S3 endpoint for accessing cloud storage.
await conn.query("SET s3_endpoint='storage.googleapis.com'")
// if private bucket
//await conn.query("SET s3_access_key_id=''")
//await conn.query("SET s3_secret_access_key=''")

// Function to execute SQL queries on the DuckDB database.
async function query(sql) {
  const q = await conn.query(sql); // Returns v = 101
  const rows = q.toArray().map(Object.fromEntries);
  rows.columns = q.schema.fields.map((d) => d.name);
  return rows;
}

// Adding an event listener for messages from the browser runtime.
browser.runtime.onMessage.addListener(hover);

// Function to handle hover events.
async function hover(request, sender, sendResponse) {
  // Extracting the file from the request
  //const fileName = request.filname;
  const fileName = request['filename'];

  // Extracting the URL from the sender (assuming it's provided)
  const url = sender.url;

  // Parsing the URL to extract the bucket name
  // Assuming the URL format is like "https://console.cloud.google.com/storage/browser/[BUCKET_NAME];..."
  const bucketName = url.split('/storage/browser/')[1].split(';')[0];

  // Constructing the file path
  const filePath = `s3://${bucketName}/${fileName}`;
  console.log(filePath);

  const schema = await query(`SELECT path_in_schema AS column_name, type FROM parquet_metadata('${filePath}');`);
  return Promise.resolve({ schema });
}

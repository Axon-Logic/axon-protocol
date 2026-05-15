import "dotenv/config";
import app from "./app.js";

const PORT = Number(process.env.API_PORT ?? 3000);
app.listen(PORT, () => console.log(`axon-api listening on :${PORT}`));

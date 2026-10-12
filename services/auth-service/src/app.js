require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/database");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "Auth Service Banner-2 funcionando",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const resultado = await pool.query("SELECT NOW()");

    res.json({
      mensaje: "Conexión a PostgreSQL correcta",
      fecha: resultado.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error conectando a PostgreSQL",
    });
  }
});

app.use("/auth", authRoutes);

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Auth Service ejecutándose en puerto ${PORT}`);
});
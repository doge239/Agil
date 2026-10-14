require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/database");
const academicoRoutes = require("./routes/academico.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "Academico Service Banner-2 funcionando",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const resultado = await pool.query("SELECT NOW()");

    res.json({
      mensaje: "Conexión a academico_db correcta",
      fecha: resultado.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error conectando a academico_db",
    });
  }
});

app.use("/academico", academicoRoutes);

const PORT = process.env.PORT || 4004;

app.listen(PORT, () => {
  console.log(`Academico Service ejecutándose en puerto ${PORT}`);
});
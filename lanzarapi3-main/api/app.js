const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors'); // Agrega el módulo CORS
const app = express();

app.use(express.json());

// Conexión a MongoDB
const uri = "mongodb+srv://joelnp:joel16@cluster0.qcsid.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
let collection;

// Función para conectar con la base de datos
async function connectToDB() {
  try {
    await client.connect();
    const database = client.db('rober');
    collection = database.collection('usuarios');
    console.log("Conectado a MongoDB");
  } catch (err) {
    console.error("Error al conectar a MongoDB:", err);
  }
}

connectToDB();

// Configurar CORS (uso del middleware CORS)
app.use(cors({
  origin: 'https://frontapi-six.vercel.app', // Aquí pones el dominio de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rutas
app.get('/api', (req, res) => {
  res.json({ message: 'Bienvenido a la API' });
});

// Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  if (!collection) return res.status(500).json({ error: "Base de datos no conectada" });
  try {
    const usuarios = await collection.find().toArray();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Obtener el primer usuario
app.get('/api/usuarios1', async (req, res) => {
  if (!collection) return res.status(500).json({ error: "Base de datos no conectada" });
  try {
    const primerUsuario = await collection.findOne(); // Obtiene el primer documento
    res.json(primerUsuario);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener el usuario" });
  }
});

// Obtener usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
  if (!collection) return res.status(500).json({ error: "Base de datos no conectada" });
  try {
    const { id } = req.params;
    const usuario = await collection.findOne({ id: parseInt(id) });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// Crear un nuevo usuario
app.post('/api/crear', async (req, res) => {
  if (!collection) return res.status(500).json({ error: "Base de datos no conectada" });
  try {
    const { nombre, apellido } = req.body;
    const nuevoUsuario = { nombre, apellido };
    await collection.insertOne(nuevoUsuario);
    res.status(201).json(nuevoUsuario);
  } catch (err) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Ruta para manejar errores 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

module.exports = app;



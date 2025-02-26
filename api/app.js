const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors'); // Importa CORS
const app = express();

// Habilita CORS para todas las solicitudes
app.use(cors());

app.use(express.json());

// Conexión a MongoDB
//const uri = "mongodb+srv://angelrp:abc123.@cluster0.76po7.mongodb.net/restaurante?retryWrites=true&w=majority&appName=Cluster0";
const uri = process.env.MONGODB_URI;

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
    const database = client.db('restaurante');
    collection = database.collection('usuarios');
    console.log("Conectado a MongoDB");
  } catch (err) {
    console.error("Error al conectar a MongoDB:", err);
  }
}
connectToDB();

// Endpoint de prueba
app.get('/api/check-db', async (req, res) => {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
    }
    const test = await collection.findOne();
    res.json({ message: 'Conexión exitosa con MongoDB Atlas', test });
  } catch (error) {
    res.status(500).json({ message: 'Error al conectar con MongoDB', error });
  }
});

// Para ver si funciona
app.get('/api', (req, res) => {
  res.json({ message: 'Bienvenido a la API hola joel hola' });
});

// Registro de usuario
app.post("/api/register", async (req, res) => {
  try {
    console.log(req.body);  // Verifica que los datos lleguen correctamente
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios." });
    }

    // Verificar si el correo ya existe
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Este correo ya está registrado." });
    }

    // Guardar el nuevo usuario sin encriptar la contraseña
    await collection.insertOne({ email, password });

    res.status(201).json({ success: true, message: "Usuario registrado correctamente." });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});
//login
app.post("/api/login", async (req, res) => {
  try {
      console.log("Datos recibidos en /api/login:", req.body);
      const { email, password } = req.body;

      if (!email || !password) {
          return res.status(400).json({ success: false, message: "Todos los campos son obligatorios." });
      }

      const user = await collection.findOne({ email, password });

      if (!user) {
          return res.status(401).json({ success: false, message: "Correo o contraseña incorrectos." });
      }

      res.status(200).json({ success: true, message: "Inicio de sesión exitoso." });
  } catch (error) {
      console.error("🔥 Error en el login:", error);
      res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});
// Endpoint para crear una reserva
app.post("/api/reservas", async (req, res) => {
  try {
      const { nombre, telefono, comensales, fecha, hora } = req.body;

      if (!nombre || !telefono || !comensales || !fecha || !hora) {
          return res.status(400).json({ success: false, message: "Todos los campos son obligatorios." });
      }

      // Convertir la fecha a tipo Date para ordenamiento futuro
      const fechaReserva = new Date(fecha);

      // Insertar en la colección "reservas"
      await client.db("restaurante").collection("reservas").insertOne({
          nombre,
          telefono,
          comensales: parseInt(comensales),
          fecha: fechaReserva,
          hora
      });

      res.status(201).json({ success: true, message: "Reserva creada exitosamente." });
  } catch (error) {
      console.error("Error al crear la reserva:", error);
      res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});
app.get("/api/reservas", async (req, res) => {
  try {
    const reservas = await client.db("restaurante").collection("reservas").find().toArray();
    res.status(200).json({ success: true, reservas });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({ success: false, message: "Error al obtener las reservas." });
  }
});

const { ObjectId } = require("mongodb"); // Importar ObjectId para manejar IDs de MongoDB

// Eliminar una reserva por ID
app.delete("/api/reservas/:id", async (req, res) => {
  try {
    const reservaId = req.params.id;

    // Verificar que el ID es válido
    if (!ObjectId.isValid(reservaId)) {
      return res.status(400).json({ success: false, message: "ID de reserva no válido." });
    }

    // Eliminar la reserva de la base de datos
    const resultado = await client.db("restaurante").collection("reservas").deleteOne({ _id: new ObjectId(reservaId) });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada." });
    }

    res.json({ success: true, message: "Reserva eliminada correctamente." });
  } catch (error) {
    console.error("Error al eliminar la reserva:", error);
    res.status(500).json({ success: false, message: "Error en el servidor." });
  }
});


// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await client.db("restaurante").collection("productos").find().toArray();
    res.status(200).json({ success: true, productos });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ success: false, message: "Error al obtener los productos." });
  }
});

// Almacenar la cesta global en una variable en memoria
let cestaGlobal = [];

// Agregar producto a la cesta
app.post("/api/cesta", async (req, res) => {
  try {
    const { productoId, cantidad } = req.body;

    if (!productoId || !cantidad) {
      return res.status(400).json({ success: false, message: "Faltan datos en la solicitud." });
    }

    // Buscar el producto en la base de datos
    const producto = await client.db("restaurante").collection("productos").findOne({ _id: new ObjectId(productoId) });

    if (!producto) {
      return res.status(404).json({ success: false, message: "Producto no encontrado." });
    }

    // Buscar si el producto ya está en la cesta global
    const productoEnCesta = cestaGlobal.find(item => item.productoId.toString() === productoId);

    if (productoEnCesta) {
      // Si el producto ya está en la cesta, aumentar la cantidad
      productoEnCesta.cantidad += cantidad;
    } else {
      // Si no está en la cesta, agregarlo
      cestaGlobal.push({ productoId: new ObjectId(productoId), cantidad, precio: producto.precio });
    }

    res.status(200).json({ success: true, message: "Producto agregado a la cesta." });
  } catch (error) {
    console.error("Error al agregar producto a la cesta:", error);
    res.status(500).json({ success: false, message: "Error al agregar producto a la cesta." });
  }
});

// Ver la cesta global (sin asociarla a un usuario)
app.get("/api/cesta", async (req, res) => {
  try {
    if (cestaGlobal.length === 0) {
      return res.status(404).json({ success: false, message: "Cesta vacía." });
    }

    // Llenar los detalles de los productos (nombre, precio, etc.)
    const productos = await Promise.all(cestaGlobal.map(async (item) => {
      const producto = await client.db("restaurante").collection("productos").findOne({ _id: item.productoId });
      return { ...producto, cantidad: item.cantidad };
    }));

    res.status(200).json({ success: true, cesta: productos });
  } catch (error) {
    console.error("Error al obtener la cesta:", error);
    res.status(500).json({ success: false, message: "Error al obtener la cesta." });
  }
});

// Eliminar producto de la cesta global
app.delete("/api/cesta/:productoId", async (req, res) => {
  try {
    const { productoId } = req.params;

    // Buscar si el producto está en la cesta global
    const productoIndex = cestaGlobal.findIndex(item => item.productoId.toString() === productoId);

    if (productoIndex === -1) {
      return res.status(404).json({ success: false, message: "Producto no encontrado en la cesta." });
    }

    // Eliminar el producto de la cesta global
    cestaGlobal.splice(productoIndex, 1);

    res.status(200).json({ success: true, message: "Producto eliminado de la cesta." });
  } catch (error) {
    console.error("Error al eliminar producto de la cesta:", error);
    res.status(500).json({ success: false, message: "Error al eliminar producto de la cesta." });
  }
});


module.exports = app;

/*
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
*/






























































































//angel
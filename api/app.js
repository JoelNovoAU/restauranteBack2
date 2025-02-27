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




let cestaGlobal = []; // Arreglo que almacena los productos de la cesta

// Obtener los productos de la cesta desde la base de datos
app.get("/api/cesta", async (req, res) => {
  try {
    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    const productos = await cestaCollection.find().toArray();
    res.status(200).json({ success: true, cesta: productos });

  } catch (error) {
    console.error("Error al obtener la cesta:", error);
    res.status(500).json({ success: false, message: "Error al obtener la cesta." });
  }
});


// Agregar producto a la cesta
// Agregar producto a la cesta y guardarlo en la base de datos
app.post("/api/cesta", async (req, res) => {
  try {
    const { productoId, nombre, precio, imagen, cantidad } = req.body;

    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    // Verificar si el producto ya está en la cesta
    const existente = await cestaCollection.findOne({ productoId });

    if (existente) {
      // Si ya existe, aumentar la cantidad
      await cestaCollection.updateOne(
        { productoId },
        { $inc: { cantidad: cantidad } }
      );
    } else {
      // Si no existe, agregarlo
      await cestaCollection.insertOne({
        productoId,
        nombre,
        precio,
        imagen,
        cantidad
      });
    }

    res.status(201).json({ success: true, message: "Producto agregado a la cesta." });

  } catch (error) {
    console.error("Error al agregar producto a la cesta:", error);
    res.status(500).json({ success: false, message: "Error al agregar producto a la cesta." });
  }
});



// Eliminar un producto de la cesta en la base de datos
app.delete("/api/cesta/:productoId", async (req, res) => {
  try {
    const { productoId } = req.params;
    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    const resultado = await cestaCollection.deleteOne({ productoId });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado en la cesta." });
    }

    res.status(200).json({ success: true, message: "Producto eliminado de la cesta." });

  } catch (error) {
    console.error("Error al eliminar producto de la cesta:", error);
    res.status(500).json({ success: false, message: "Error al eliminar producto de la cesta." });
  }
});

app.get("/api/cesta", async (req, res) => {
  try {
    const db = client.db("restaurante");
    const cestaCollection = db.collection("productos");

    // Obtener los productos de la cesta
    const productos = await cestaCollection.find().toArray();
    res.status(200).json({ success: true, cesta: productos });

  } catch (error) {
    console.error("Error al obtener la cesta:", error);
    res.status(500).json({ success: false, message: "Error al obtener la cesta." });
  }
});

// Ruta para procesar el pedido y almacenarlo en la base de datos
app.post("/api/pedidos", async (req, res) => {
  try {
    // Obtener los datos del pedido
    const { cliente, pago, productos, total } = req.body;

    // Validar los datos recibidos
    if (!cliente || !pago || !productos || !total) {
      return res.status(400).json({ success: false, message: "Faltan datos para procesar el pedido." });
    }

    // Conectar a la base de datos
    const db = client.db("restaurante");
    const pedidosCollection = db.collection("pedidos");

    // Crear el nuevo pedido
    const nuevoPedido = {
      cliente,
      pago,
      productos,
      total,
      fecha: new Date(),
    };

    // Guardar el pedido en la base de datos
    const result = await pedidosCollection.insertOne(nuevoPedido);

    // Limpiar la cesta después de realizar el pedido
    const cestaCollection = db.collection("productos");
    await cestaCollection.deleteMany({}); // Eliminar todos los productos de la cesta

    res.status(201).json({ success: true, message: "Pedido realizado con éxito.", pedidoId: result.insertedId });

  } catch (error) {
    console.error("Error al procesar el pedido:", error);
    res.status(500).json({ success: false, message: "Hubo un error al procesar el pedido." });
  }
});

// Ruta para cancelar un pedido
app.patch("/api/pedidos/cancelar/:pedidoId", async (req, res) => {
  try {
    const { pedidoId } = req.params;

    // Verificar que el ID del pedido es válido
    if (!ObjectId.isValid(pedidoId)) {
      return res.status(400).json({ success: false, message: "ID de pedido no válido." });
    }

    // Buscar y actualizar el estado del pedido
    const pedido = await client.db("restaurante").collection("pedidos").findOne({ _id: new ObjectId(pedidoId) });

    if (!pedido) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado." });
    }

    if (pedido.estado === "cancelado") {
      return res.status(400).json({ success: false, message: "El pedido ya está cancelado." });
    }

    // Actualizar el estado del pedido a "cancelado"
    await client.db("restaurante").collection("pedidos").updateOne(
      { _id: new ObjectId(pedidoId) },
      { $set: { estado: "cancelado" } }
    );

    res.status(200).json({ success: true, message: "Pedido cancelado correctamente." });
  } catch (error) {
    console.error("Error al cancelar el pedido:", error);
    res.status(500).json({ success: false, message: "Hubo un error al cancelar el pedido." });
  }
});

// Ruta para aceptar un pedido
app.patch("/api/pedidos/aceptar/:pedidoId", async (req, res) => {
  try {
    const { pedidoId } = req.params;

    // Verificar que el ID del pedido es válido
    if (!ObjectId.isValid(pedidoId)) {
      return res.status(400).json({ success: false, message: "ID de pedido no válido." });
    }

    // Buscar y actualizar el estado del pedido
    const pedido = await client.db("restaurante").collection("pedidos").findOne({ _id: new ObjectId(pedidoId) });

    if (!pedido) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado." });
    }

    if (pedido.estado === "aceptado") {
      return res.status(400).json({ success: false, message: "El pedido ya está aceptado." });
    }

    // Actualizar el estado del pedido a "aceptado"
    await client.db("restaurante").collection("pedidos").updateOne(
      { _id: new ObjectId(pedidoId) },
      { $set: { estado: "aceptado" } }
    );

    res.status(200).json({ success: true, message: "Pedido aceptado correctamente." });
  } catch (error) {
    console.error("Error al aceptar el pedido:", error);
    res.status(500).json({ success: false, message: "Hubo un error al aceptar el pedido." });
  }
});


module.exports = app;






























































































//angel
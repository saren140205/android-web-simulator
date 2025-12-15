const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Permite que el simulador pida datos

const app = express();
const PORT = 3000;

// --- CONFIGURACIÓN ---
// ¡CAMBIA ESTO POR LA RUTA DE TU CARPETA DE FOTOS!
// Ejemplo Windows: 'C:/Users/TuUsuario/Pictures/FondoPantalla'
// Ejemplo Mac/Linux: '/Users/tuusuario/Pictures'
const RUTA_DE_TUS_FOTOS = 'C:/Users/hakuc/OneDrive/Documentos/B/mi-galeria/uploads';

// Permitir que el navegador (tu simulador) haga peticiones aquí
app.use(cors());

// Servir las imágenes estáticas para que se puedan ver
app.use('/imagenes', express.static(RUTA_DE_TUS_FOTOS));

// Endpoint para obtener la lista de archivos
app.get('/api/fotos', (req, res) => {
    fs.readdir(RUTA_DE_TUS_FOTOS, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'No se pudo leer la carpeta' });
        }

        // Filtrar solo imágenes (jpg, png, gif, jpeg)
        const imagenes = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });

        // Crear la respuesta con la URL completa para cada foto
        const respuesta = imagenes.map((archivo, index) => ({
            id: `server-${index}`, // ID único
            name: archivo,
            // Esta URL apunta a este mismo servidor
            data: `http://localhost:${PORT}/imagenes/${archivo}`,
            isLocal: false // Para saber que viene del PC, no del navegador
        }));

        res.json(respuesta);
    });
});

app.listen(PORT, () => {
    console.log(`📡 Servidor de Galería corriendo en http://localhost:${PORT}`);
    console.log(`📂 Leyendo fotos de: ${RUTA_DE_TUS_FOTOS}`);
});
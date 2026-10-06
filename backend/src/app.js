const express = require('express');
const documentsRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use(documentsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'O arquivo excede o tamanho máximo permitido.'
      }
    });
  }

  if (error.name === 'MulterError') {
    return res.status(400).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Não foi possível processar o arquivo enviado.'
      }
    });
  }

  console.error('Erro não tratado na API:', error);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro interno.'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;

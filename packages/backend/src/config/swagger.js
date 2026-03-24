import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tastr API',
      version: '1.0.0',
      description: 'Tastr food delivery platform REST API',
    },
    servers: [
      { url: 'http://localhost:8000', description: 'Development' },
      { url: 'https://api.theeazy.io', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code:    { type: 'string', example: 'INVALID_CREDENTIALS' },
            message: { type: 'string' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn:    { type: 'number', example: 900 },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            name:        { type: 'string' },
            email:       { type: 'string' },
            phone:       { type: 'string' },
            role:        { type: 'string', enum: ['CUSTOMER', 'DRIVER', 'RESTAURANT_OWNER', 'RESTAURANT_STAFF', 'SUPER_ADMIN', 'SUB_ADMIN'] },
            status:      { type: 'string', enum: ['PENDING', 'ACTIVE', 'SUSPENDED'] },
            profilePhoto:{ type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const spec = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: 'Tastr API Docs',
    customCss: '.swagger-ui .topbar { background-color: #C18B3C; }',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(spec));
}

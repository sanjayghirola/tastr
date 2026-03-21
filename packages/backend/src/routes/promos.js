import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as promosController from '../controllers/promos.js';

const router = Router();
router.get('/',          verifyToken, promosController.listPromos);
router.post('/',         verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), promosController.createPromo);
router.put('/:id',       verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), promosController.updatePromo);
router.delete('/:id',    verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.SUPER_ADMIN, ROLES.SUB_ADMIN), promosController.deletePromo);
router.post('/validate', verifyToken, promosController.validatePromo);
export default router;

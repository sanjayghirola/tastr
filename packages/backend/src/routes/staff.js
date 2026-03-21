import { Router } from 'express';
import { body, param } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ROLES } from '@tastr/shared';
import * as staffController from '../controllers/staff.js';

const router = Router();
router.use(verifyToken, requireRole(ROLES.RESTAURANT_OWNER, ROLES.RESTAURANT_STAFF));

router.get('/',                staffController.listStaff);
router.post('/',               [body('email').isEmail()], validate, staffController.inviteStaff);
router.put('/:staffId',        [param('staffId').isMongoId()], validate, staffController.updateStaff);
router.delete('/:staffId',     [param('staffId').isMongoId()], validate, staffController.removeStaff);
router.get('/roles',           staffController.listRoles);
router.post('/roles',          [body('name').notEmpty()], validate, staffController.createRole);
router.put('/roles/:roleId',   [param('roleId').isMongoId()], validate, staffController.updateRole);
router.delete('/roles/:roleId',[param('roleId').isMongoId()], validate, staffController.deleteRole);
export default router;

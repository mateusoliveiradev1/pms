import { Router } from 'express';
import { createPlan, listPlans, updatePlan, deletePlan } from '../controllers/plansController';

const router = Router();

router.post('/', createPlan);
router.get('/', listPlans);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

export default router;

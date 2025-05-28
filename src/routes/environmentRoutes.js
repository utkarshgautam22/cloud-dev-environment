// src/routes/environmentRoutes.js
const express = require('express');
const environmentController = require('../controllers/environmentController');
const router = express.Router();

router.post('/', environmentController.createEnvironment);
router.get('/', environmentController.getAllEnvironments);
router.delete('/:id', environmentController.deleteEnvironment);

module.exports = router;

// src/controllers/environmentController.js
const dockerService = require('../services/dockerService');

async function createEnvironment(req, res) {
    const { type } = req.body; // e.g., "python", "nodejs"
    const userId = req.headers['x-user-id'] || 'anonymous';

    if (!type) {
        return res.status(400).json({ error: 'Environment type is required' });
    }

    try {
        const environment = await dockerService.provisionEnvironment(type, userId);
        res.status(201).json(environment);
    } catch (error) {
        console.error(`Controller error: ${error.message}`);
        res.status(500).json({ error: 'Failed to provision environment', details: error.message });
    }
}

async function deleteEnvironment(req, res) {
    let { id } = req.params;
    // Remove leading colon if user included ':' in the URL segment
    if (id.startsWith(':')) {
        id = id.slice(1);
    }
    const userId = req.headers['x-user-id'] || 'anonymous';

    try {
        const result = await dockerService.terminateEnvironment(id, userId);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Controller error: ${error.message}`);
        if (error.message === 'Container not found') {
            return res.status(404).json({ error: 'Environment not found' });
        }
        res.status(500).json({ error: 'Failed to terminate environment', details: error.message });
    }
}

async function getAllEnvironments(req, res) {
    try {
        const userId = req.headers['x-user-id'] || 'anonymous';
        const environments = await dockerService.listContainers(userId);
        res.status(200).json(environments);
    } catch (error) {
        console.error(`Controller error: ${error.message}`);
        res.status(500).json({ error: 'Failed to list environments', details: error.message });
    }
}

module.exports = {
    createEnvironment,
    deleteEnvironment,
    getAllEnvironments
};

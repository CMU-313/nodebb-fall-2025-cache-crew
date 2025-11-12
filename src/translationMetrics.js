'use strict';

// Simple in-memory metrics tracker
const metrics = {
	totalRequests: 0,
	successfulRequests: 0,
	failedRequests: 0,
	avgResponseTimeMs: 0,
};

function record(success, startTime) {
	const duration = Date.now() - startTime;
	metrics.totalRequests += 1;
	if (success) {
		metrics.successfulRequests += 1;
	} else {
		metrics.failedRequests += 1;
	}
	// Rolling average latency
	const n = metrics.totalRequests;
	metrics.avgResponseTimeMs =
		((metrics.avgResponseTimeMs * (n - 1)) + duration) / n;
}

function getMetrics() {
	return metrics;
}

module.exports = { record, getMetrics };

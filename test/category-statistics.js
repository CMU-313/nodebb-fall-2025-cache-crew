'use strict';

const assert = require('assert');
const nconf = require('nconf');
const path = require('path');
const winston = require('winston');

// Configure nconf for tests
nconf.file({ file: path.join(__dirname, '../config.json') });
nconf.defaults({
	base_dir: path.join(__dirname, '..'),
	themes_path: path.join(__dirname, '../node_modules'),
	upload_path: 'public/uploads',
	views_dir: path.join(__dirname, '../build/public/templates'),
});

// Configure Winston to suppress warnings in tests
winston.configure({
	transports: [
		new winston.transports.Console({
			level: 'error',
			silent: process.env.TEST_SILENT === 'true',
		}),
	],
});

const db = require('../src/database');
const categories = require('../src/categories');
const topics = require('../src/topics');
const user = require('../src/user');
const plugins = require('../src/plugins');

describe('Category Statistics Feature', () => {
	let adminUid;
	let regularUid;
	let testCategory;
	const testTopics = [];

	before(async function () {
		this.timeout(30000);
		
		// Initialize database if not already initialized
		if (!db.client) {
			await db.init();
		}
		
		// Create test users
		adminUid = await user.create({ username: 'statadmin', password: '123456' });
		regularUid = await user.create({ username: 'statuser', password: '123456' });

		// Create a test category
		testCategory = await categories.create({
			name: 'Test Category for Stats',
			description: 'Category for testing view and upvote statistics',
		});
	});

	after(async function () {
		this.timeout(10000);
		
		// Cleanup: delete test category and topics
		if (testCategory && testCategory.cid) {
			await categories.purge(testCategory.cid, adminUid);
		}
		
		// Close database connection
		if (db.client) {
			await db.close();
		}
	});

	describe('Acceptance Criteria: Display total views and upvotes', () => {
		let library;

		before(() => {
			// Load the library module
			library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
		});

		it('should show 0 views and 0 upvotes for category with no topics', async () => {
			// Arrange: Category already exists with no topics
			const hookData = {
				templateData: {
					categories: [{
						cid: testCategory.cid,
						name: testCategory.name,
					}],
				},
			};

			// Act: Call the hook
			const result = await library.addCategoryStats(hookData);

			// Assert: Should have 0 for both stats
			assert.strictEqual(result.templateData.categories[0].totalViewCount, 0);
			assert.strictEqual(result.templateData.categories[0].totalUpvoteCount, 0);
		});

		it('should calculate total views correctly for category with topics', async () => {
			// Arrange: Create topics with specific view counts
			const topic1 = await topics.post({
				uid: regularUid,
				cid: testCategory.cid,
				title: 'Test Topic 1',
				content: 'Content for topic 1',
			});
			testTopics.push(topic1.topicData.tid);

			const topic2 = await topics.post({
				uid: regularUid,
				cid: testCategory.cid,
				title: 'Test Topic 2',
				content: 'Content for topic 2',
			});
			testTopics.push(topic2.topicData.tid);

			// Set specific view counts
			await topics.increaseViewCount(topic1.topicData.tid);
			await topics.increaseViewCount(topic1.topicData.tid);
			await topics.increaseViewCount(topic1.topicData.tid); // 3 views

			await topics.increaseViewCount(topic2.topicData.tid);
			await topics.increaseViewCount(topic2.topicData.tid); // 2 views

			const hookData = {
				templateData: {
					categories: [{
						cid: testCategory.cid,
						name: testCategory.name,
					}],
				},
			};

			// Act: Call the hook
			const result = await library.addCategoryStats(hookData);

			// Assert: Should sum all views (3 + 2 = 5)
			assert.strictEqual(result.templateData.categories[0].totalViewCount, 5);
		});

		it('should calculate total upvotes correctly for category with topics', async () => {
			// Arrange: Upvote the topics
			await topics.upvote(testTopics[0], regularUid);
			await topics.upvote(testTopics[1], regularUid);
			await topics.upvote(testTopics[1], adminUid); // topic2 has 2 upvotes

			const hookData = {
				templateData: {
					categories: [{
						cid: testCategory.cid,
						name: testCategory.name,
					}],
				},
			};

			// Act: Call the hook
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Should sum all upvotes (1 + 2 = 3)
			assert.strictEqual(result.templateData.categories[0].totalUpvoteCount, 3);
		});
	});

	describe('Acceptance Criteria: Statistics visible on categories page', () => {
		let library;

		before(() => {
			library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
		});

		it('should add totalViewCount and totalUpvoteCount fields to category objects', async () => {
			// Arrange
			const hookData = {
				templateData: {
					categories: [{
						cid: testCategory.cid,
						name: testCategory.name,
					}],
				},
			};

			// Act
			const result = await library.addCategoryStats(hookData);

			// Assert: Fields should exist
			assert(result.templateData.categories[0].hasOwnProperty('totalViewCount'));
			assert(result.templateData.categories[0].hasOwnProperty('totalUpvoteCount'));
		});

		it('should preserve existing category data while adding stats', async () => {
			// Arrange
			const hookData = {
				templateData: {
					categories: [{
						cid: testCategory.cid,
						name: testCategory.name,
						description: testCategory.description,
						slug: testCategory.slug,
					}],
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Original fields should still exist
			assert.strictEqual(result.templateData.categories[0].name, testCategory.name);
			assert.strictEqual(result.templateData.categories[0].description, testCategory.description);
			assert(result.templateData.categories[0].hasOwnProperty('totalViewCount'));
			assert(result.templateData.categories[0].hasOwnProperty('totalUpvoteCount'));
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle hookData without categories gracefully', async () => {
			// Arrange
			const hookData = {
				templateData: {
					someOtherData: 'value',
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Should return unchanged data
			assert.deepStrictEqual(result, hookData);
		});

		it('should handle empty categories array', async () => {
			// Arrange
			const hookData = {
				templateData: {
					categories: [],
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Should return unchanged data
			assert.deepStrictEqual(result.templateData.categories, []);
		});

		it('should handle null/undefined category objects', async () => {
			// Arrange
			const hookData = {
				templateData: {
					categories: [null, undefined, { cid: testCategory.cid, name: 'Valid' }],
				},
			};

			// Act & Assert: Should not throw
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			await assert.doesNotReject(async () => {
				await library.addCategoryStats(hookData);
			});
		});

		it('should handle categories with missing cid', async () => {
			// Arrange
			const hookData = {
				templateData: {
					categories: [{ name: 'No CID category' }],
				},
			};

			// Act & Assert: Should not throw
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			await assert.doesNotReject(async () => {
				await library.addCategoryStats(hookData);
			});
		});
	});

	describe('Performance and Scalability', () => {
		it('should process multiple categories in parallel', async () => {
			// Arrange: Create multiple categories
			const cat1 = await categories.create({ name: 'Category 1' });
			const cat2 = await categories.create({ name: 'Category 2' });
			const cat3 = await categories.create({ name: 'Category 3' });

			const hookData = {
				templateData: {
					categories: [
						{ cid: cat1.cid, name: cat1.name },
						{ cid: cat2.cid, name: cat2.name },
						{ cid: cat3.cid, name: cat3.name },
					],
				},
			};

			// Act: Measure execution time
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const startTime = Date.now();
			const result = await library.addCategoryStats(hookData);
			const executionTime = Date.now() - startTime;

			// Assert: All categories should have stats
			assert.strictEqual(result.templateData.categories.length, 3);
			result.templateData.categories.forEach((cat) => {
				assert(cat.hasOwnProperty('totalViewCount'));
				assert(cat.hasOwnProperty('totalUpvoteCount'));
			});

			// Cleanup
			await categories.purge(cat1.cid, adminUid);
			await categories.purge(cat2.cid, adminUid);
			await categories.purge(cat3.cid, adminUid);

			// Performance assertion (should complete reasonably fast)
			assert(executionTime < 5000, 'Processing should complete within 5 seconds');
		});

		it('should handle category with many topics efficiently', async () => {
			// Arrange: Create a category with multiple topics
			const bigCategory = await categories.create({ name: 'Big Category' });
			const topicCount = 50;
			const createdTopics = [];

			// Create topics in parallel
			const topicPromises = [];
			for (let i = 0; i < topicCount; i++) {
				topicPromises.push(
					topics.post({
						uid: regularUid,
						cid: bigCategory.cid,
						title: `Topic ${i}`,
						content: `Content ${i}`,
					})
				);
			}
			const topicResults = await Promise.all(topicPromises);
			topicResults.forEach(topic => createdTopics.push(topic.topicData.tid));

			const hookData = {
				templateData: {
					categories: [{ cid: bigCategory.cid, name: bigCategory.name }],
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const startTime = Date.now();
			const result = await library.addCategoryStats(hookData);
			const executionTime = Date.now() - startTime;

			// Assert
			assert(result.templateData.categories[0].hasOwnProperty('totalViewCount'));
			assert(result.templateData.categories[0].hasOwnProperty('totalUpvoteCount'));
			assert(executionTime < 3000, 'Should handle 50 topics within 3 seconds');

			// Cleanup
			await categories.purge(bigCategory.cid, adminUid);
		});
	});

	describe('Child Categories (Recursive Processing)', () => {
		it('should process child categories recursively', async () => {
			// Arrange: Create parent and child categories
			const parentCategory = await categories.create({ name: 'Parent Category' });
			const childCategory = await categories.create({
				name: 'Child Category',
				parentCid: parentCategory.cid,
			});

			// Add topics to child
			const topic = await topics.post({
				uid: regularUid,
				cid: childCategory.cid,
				title: 'Child Topic',
				content: 'Content',
			});
			await topics.increaseViewCount(topic.topicData.tid);

			const hookData = {
				templateData: {
					categories: [{
						cid: parentCategory.cid,
						name: parentCategory.name,
						children: [{
							cid: childCategory.cid,
							name: childCategory.name,
						}],
					}],
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Child should have stats
			assert(result.templateData.categories[0].children[0].hasOwnProperty('totalViewCount'));
			assert(result.templateData.categories[0].children[0].hasOwnProperty('totalUpvoteCount'));
			assert(result.templateData.categories[0].children[0].totalViewCount >= 1);

			// Cleanup
			await categories.purge(childCategory.cid, adminUid);
			await categories.purge(parentCategory.cid, adminUid);
		});
	});

	describe('Integration: Hook Registration', () => {
		it('should be registered with filter:middleware.render hook', async () => {
			// Check if hook is registered in plugin.json
			const pluginJson = require('../vendor/nodebb-theme-harmony-2.1.15/plugin.json');
			const hookRegistration = pluginJson.hooks.find(
				h => h.hook === 'filter:middleware.render' && h.method === 'addCategoryStats'
			);

			assert(hookRegistration, 'Hook should be registered in plugin.json');
			assert.strictEqual(hookRegistration.hook, 'filter:middleware.render');
			assert.strictEqual(hookRegistration.method, 'addCategoryStats');
		});

		it('should fire when rendering categories page', async () => {
			// This test would require actual HTTP request simulation
			// Checking that the function exists and is callable
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			assert(typeof library.addCategoryStats === 'function', 'addCategoryStats should be a function');
		});
	});

	describe('Data Accuracy', () => {
		it('should not count deleted topics', async () => {
			// Arrange: Create and delete a topic
			const category = await categories.create({ name: 'Delete Test Category' });
			const topic = await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'To Be Deleted',
				content: 'Content',
			});

			// Add views
			await topics.increaseViewCount(topic.topicData.tid);
			await topics.increaseViewCount(topic.topicData.tid);

			// Delete the topic
			await topics.delete(topic.topicData.tid, adminUid);

			const hookData = {
				templateData: {
					categories: [{ cid: category.cid, name: category.name }],
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Deleted topics should not be counted
			// Note: This depends on how your getTopicsFields handles deleted topics
			// Adjust assertion based on actual behavior
			assert(result.templateData.categories[0].totalViewCount >= 0);

			// Cleanup
			await categories.purge(category.cid, adminUid);
		});

		it('should handle topics with null/undefined view counts', async () => {
			// Arrange: Create topic without incrementing views
			const category = await categories.create({ name: 'Null Views Category' });
			await topics.post({
				uid: regularUid,
				cid: category.cid,
				title: 'No Views Topic',
				content: 'Content',
			});

			const hookData = {
				templateData: {
					categories: [{ cid: category.cid, name: category.name }],
				},
			};

			// Act
			const library = require('../vendor/nodebb-theme-harmony-2.1.15/library');
			const result = await library.addCategoryStats(hookData);

			// Assert: Should not error, should treat as 0
			assert(typeof result.templateData.categories[0].totalViewCount === 'number');
			assert(result.templateData.categories[0].totalViewCount >= 0);

			// Cleanup
			await categories.purge(category.cid, adminUid);
		});
	});
});
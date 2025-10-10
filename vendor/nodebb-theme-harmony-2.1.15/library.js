'use strict';

const nconf = require.main.require('nconf');
const meta = require.main.require('./src/meta');
const _ = require.main.require('lodash');
const user = require.main.require('./src/user');
const controllers = require('./lib/controllers');

const Topics = require.main.require('./src/topics');
// const categories = require.main.require('./src/categories');

const library = module.exports;

const defaults = {
	enableQuickReply: 'on',
	enableBreadcrumbs: 'on',
	centerHeaderElements: 'off',
	mobileTopicTeasers: 'off',
	stickyToolbar: 'on',
	topicSidebarTools: 'on',
	topMobilebar: 'off',
	autohideBottombar: 'on',
	openSidebars: 'off',
	chatModals: 'off',
};

library.init = async function (params) {
	console.log('[Harmony] Theme loaded and initialized');
	const { router, middleware } = params;
	const routeHelpers = require.main.require('./src/routes/helpers');

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/harmony', [], controllers.renderAdminPage);

	routeHelpers.setupPageRoute(router, '/user/:userslug/theme', [
		middleware.exposeUid,
		middleware.ensureLoggedIn,
		middleware.canViewUsers,
		middleware.checkAccountPermissions,
	], controllers.renderThemeSettings);

	if (nconf.get('isPrimary') && process.env.NODE_ENV === 'production') {
		setTimeout(buildSkins, 0);
	}
};

async function buildSkins() {
	try {
		const plugins = require.main.require('./src/plugins');
		await plugins.prepareForBuild(['client side styles']);
		for (const skin of meta.css.supportedSkins) {
			// eslint-disable-next-line no-await-in-loop
			await meta.css.buildBundle(`client-${skin}`, true);
		}
		require.main.require('./src/meta/minifier').killAll();
	} catch (err) {
		console.error(err.stack);
	}
}

library.addAdminNavigation = async function (header) {
	header.plugins.push({
		route: '/plugins/harmony',
		icon: 'fa-paint-brush',
		name: '[[themes/harmony:theme-name]]',
	});
	return header;
};

library.addProfileItem = async (data) => {
	data.links.push({
		id: 'theme',
		route: 'theme',
		icon: 'fa-paint-brush',
		name: '[[themes/harmony:settings.title]]',
		visibility: {
			self: true,
			other: false,
			moderator: false,
			globalMod: false,
			admin: false,
		},
	});

	return data;
};

library.defineWidgetAreas = async function (areas) {
	const locations = ['header', 'sidebar', 'footer'];
	const templates = [
		'categories.tpl', 'category.tpl', 'topic.tpl', 'users.tpl',
		'unread.tpl', 'recent.tpl', 'popular.tpl', 'top.tpl', 'tags.tpl', 'tag.tpl',
		'login.tpl', 'register.tpl', 'world.tpl',
	];
	function capitalizeFirst(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
	templates.forEach((template) => {
		locations.forEach((location) => {
			areas.push({
				name: `${capitalizeFirst(template.split('.')[0])} ${capitalizeFirst(location)}`,
				template: template,
				location: location,
			});
		});
	});

	areas = areas.concat([
		{
			name: 'Main post header',
			template: 'topic.tpl',
			location: 'mainpost-header',
		},
		{
			name: 'Main post footer',
			template: 'topic.tpl',
			location: 'mainpost-footer',
		},
		{
			name: 'Sidebar Footer',
			template: 'global',
			location: 'sidebar-footer',
		},
		{
			name: 'Brand Header',
			template: 'global',
			location: 'brand-header',
		},
		{
			name: 'About me (before)',
			template: 'account/profile.tpl',
			location: 'profile-aboutme-before',
		},
		{
			name: 'About me (after)',
			template: 'account/profile.tpl',
			location: 'profile-aboutme-after',
		},
	]);

	return areas;
};

library.loadThemeConfig = async function (uid) {
	const [themeConfig, userConfig] = await Promise.all([
		meta.settings.get('harmony'),
		user.getSettings(uid),
	]);

	const config = { ...defaults, ...themeConfig, ...(_.pick(userConfig, Object.keys(defaults))) };
	config.enableQuickReply = config.enableQuickReply === 'on';
	config.enableBreadcrumbs = config.enableBreadcrumbs === 'on';
	config.centerHeaderElements = config.centerHeaderElements === 'on';
	config.mobileTopicTeasers = config.mobileTopicTeasers === 'on';
	config.stickyToolbar = config.stickyToolbar === 'on';
	config.topicSidebarTools = config.topicSidebarTools === 'on';
	config.autohideBottombar = config.autohideBottombar === 'on';
	config.topMobilebar = config.topMobilebar === 'on';
	config.openSidebars = config.openSidebars === 'on';
	config.chatModals = config.chatModals === 'on';
	return config;
};

library.getThemeConfig = async function (config) {
	console.log('[Harmony] getThemeConfig called - theme is working!');
	config.theme = await library.loadThemeConfig(config.uid);
	config.openDraftsOnPageLoad = false;
	return config;
};

library.getAdminSettings = async function (hookData) {
	if (hookData.plugin === 'harmony') {
		hookData.values = {
			...defaults,
			...hookData.values,
		};
	}
	return hookData;
};

library.saveUserSettings = async function (hookData) {
	Object.keys(defaults).forEach((key) => {
		if (hookData.data.hasOwnProperty(key)) {
			hookData.settings[key] = hookData.data[key] || undefined;
		}
	});
	return hookData;
};

library.filterMiddlewareRenderHeader = async function (hookData) {
	hookData.templateData.bootswatchSkinOptions = await meta.css.getSkinSwitcherOptions(hookData.req.uid);
	return hookData;
};

library.addCategoryStats = async (hookData) => {
	// Check if this is the categories page
	if (!hookData.templateData || !hookData.templateData.categories) {
		return hookData;
	}
	
	const categoryList = hookData.templateData.categories;
	if (!Array.isArray(categoryList) || categoryList.length === 0) {
		return hookData;
	}
	
	console.log('[Harmony] Adding category stats for', categoryList.length, 'categories');
	
	try {
		// Process all categories including children
		async function processCategoryTree(cats) {
			await Promise.all(cats.map(async (category) => {
				if (!category || !category.cid) return;
				
				console.log(`[Harmony] Processing category: ${category.name} (cid: ${category.cid})`);
				
				// Get all topic IDs
				const db = require.main.require('./src/database');
				const topicIds = await db.getSortedSetRange(`cid:${category.cid}:tids`, 0, -1);
				
				if (!topicIds || !topicIds.length) {
					category.totalViewCount = 0;
					category.totalUpvoteCount = 0;
					console.log(`[Harmony] Category ${category.name}: No topics, set to 0`);
				} else {
					// Get ALL fields from first topic to see what's available
					const firstTopicAllFields = await Topics.getTopicFields(topicIds[0], []);
					console.log(`[Harmony] ALL fields from first topic:`, Object.keys(firstTopicAllFields));
					
					// Try different possible field names
					const topics = await Topics.getTopicsFields(topicIds, ['viewcount', 'views', 'upvotes', 'votes']);
					console.log(`[Harmony] Got ${topics.length} topics. First topic full data:`, topics[0]);
					
					// Try viewcount instead of views
					category.totalViewCount = topics.reduce((sum, t) => sum + (parseInt(t.viewcount || t.views) || 0), 0);
					category.totalUpvoteCount = topics.reduce((sum, t) => sum + (parseInt(t.upvotes || t.votes) || 0), 0);
					
					console.log(`[Harmony] Category ${category.name}: FINAL views=${category.totalViewCount}, upvotes=${category.totalUpvoteCount}`);
				}
				
				// Process children recursively
				if (category.children && category.children.length > 0) {
					await processCategoryTree(category.children);
				}
			}));
		}
		
		await processCategoryTree(categoryList);
		console.log('[Harmony] Finished processing all categories');
	} catch (err) {
		console.error('[Harmony theme] Failed to add category stats:', err);
		console.error('[Harmony theme] Error stack:', err.stack);
	}
	
	return hookData;
};
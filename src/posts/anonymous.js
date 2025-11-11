'use strict';

const DISPLAY_NAME = 'Anonymous';
const ICON_TEXT = 'A';
const ICON_BG_COLOR = '#6c757d';

module.exports = function (Posts) {
	Posts.getAnonymousDisplayName = () => DISPLAY_NAME;

	Posts.buildAnonymousUser = function (uid) {
		const parsedUid = parseUid(uid);
		return createBaseUser(parsedUid);
	};

	Posts.anonymizeUser = function (user, fallbackUid) {
		const uid = typeof user?.uid !== 'undefined' ? parseUid(user.uid) : parseUid(fallbackUid);
		return createBaseUser(uid);
	};

	Posts.anonymizePostAuthor = function (post) {
		if (!Posts.isAnonymous(post)) {
			return post;
		}

		const uidFromPost = typeof post?.uid !== 'undefined' ? parseUid(post.uid) : undefined;
		const uidFromUser = typeof post?.user?.uid !== 'undefined' ? parseUid(post.user.uid) : undefined;

		post.user = createBaseUser(typeof uidFromUser !== 'undefined' ? uidFromUser : uidFromPost);
		return post;
	};

	Posts.isAnonymous = function (post) {
		return Boolean(post && post.is_anonymous);
	};
};

function parseUid(uid) {
	if (typeof uid === 'number') {
		return uid;
	}
	if (typeof uid === 'string' && uid) {
		const parsed = parseInt(uid, 10);
		return Number.isNaN(parsed) ? undefined : parsed;
	}
	return undefined;
}

function createBaseUser(uid) {
	return {
		uid: typeof uid === 'number' ? uid : 0,
		username: DISPLAY_NAME,
		displayname: DISPLAY_NAME,
		fullname: null,
		userslug: null,
		picture: '',
		status: null,
		isLocal: false,
		isAnonymous: true,
		banned: false,
		'icon:text': ICON_TEXT,
		'icon:bgColor': ICON_BG_COLOR,
		custom_profile_info: [],
		selectedGroups: [],
	};
}

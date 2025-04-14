import constants from './settings/constants.js';
import { SETTINGS } from './settings/settings.js';
import { socketDismissFullscreenMedia } from './socket.js';

/**
 * Create a dedicated dom layer for sharing a media fullscreen
 */
class shareFullscreenLayer {
	init() {
		this._createContainer();
		this._activateListeners();
	}

	_createContainer() {
		const dismissButton = game.user.isGM
			? `<button class="dismiss"><i class="fas fa-times"></i> ${game.i18n.localize(
					`${constants.moduleName}.share.fullscreen-dismiss-button`
			  )}</button>`
			: '';
		const minimizeButton = (localizedTitle) => {
			return game.user.isGM
				? `<button class="minimize" title="${localizedTitle}">
                        <i class="fas fa-window-minimize"></i>
                    </button>`
				: '';
		};

		const maximizeButton = (localizedTitle) => {
			return game.user.isGM
				? `<button class="maximize hidden" title="${localizedTitle}">
                        <i class="fas fa-window-maximize"></i>
                    </button>`
				: '';
		};

		const bottomButtons = game.settings.get(
			constants.moduleName,
			SETTINGS.FULLSCREEN_BUTTONS_BOTTOM
		)
			? 'bottom'
			: '';

		this.container = $(`<div id="fullscreen-layer" class="hidden"></div>`)
			.append(`
                <div class="background"></div>
                <div class="npc hidden"></div>
                <img src="${
					constants.modulePath
				}/images/transparent.png" alt="">
                <video playsinline src="" class="disabled"></video>
                <div class="darkness"></div>
                <div class="buttons ${bottomButtons}">
                    ${dismissButton}
                    ${minimizeButton(
						game.i18n.localize(
							constants.moduleName +
								'.share.fullscreen-minimize-button'
						)
					)}
            ${maximizeButton(
				game.i18n.localize(
					constants.moduleName + '.share.fullscreen-maximize-button'
				)
			)}
                    
                </div>
                <div class="title hidden"></div>
            `);

		const otherModules = document.querySelectorAll(
			'.gm-screen-app, #dice-box-canvas'
		);

		otherModules?.[0]
			? this.container.insertBefore($(otherModules[0]))
			: this.container.insertBefore($(document.getElementById('pause')));
	}

	_activateListeners() {
		this.container
			.find('button.dismiss')
			.click((e) => socketDismissFullscreenMedia());
		this.container
			.find('button.minimize')
			.click((e) => this.toggleMinimize());
		this.container
			.find('button.maximize')
			.click((e) => this.toggleMinimize());
	}

	handleShare(
		url,
		type = 'image',
		title = '',
		immersive = false,
		loop = false,
		mute = true,
		isNpc = false
	) {
		const background = this.container.find('.background');
		const npc = this.container.find('.npc');
		const img = this.container.find('img');
		const video = this.container.find('video');
		const videoContainer = video.get(0);
		const minimizeButton = this.container.find('.minimize');
		const maximizeButton = this.container.find('.maximize');
		const titleContainer = this.container.find('.title');
		const darknessContainer = this.container.find('.darkness');

		immersive
			? this.container.addClass('immersive-mode')
			: this.container.removeClass('immersive-mode');

		if (type === 'image') {
			debugger;
			if (!isNpc) {
				npc.addClass('hidden');
				if (url.endsWith('.jpg')) {
					background.css('background-image', `url("${url}")`);
				} else {
					background.css(
						'background-image',
						`url("${constants.modulePath}/images/black.png")`
					);
				}
			} else {
				npc.css('background-image', `url("${url}")`);
				npc.removeClass('hidden');
			}

			video.addClass('disabled');

			img.attr('src', url);
			img.removeClass('disabled');
		}

		if (type === 'video') {
			background.css(
				'background-image',
				`url("${constants.modulePath}/images/black.png")`
			);

			img.addClass('disabled');

			video.attr('src', url);
			video.removeClass('disabled');

			videoContainer.loop = loop;
			videoContainer.muted = mute;
			videoContainer.onended = loop ? null : () => this.handleDismiss();
			videoContainer.play().catch((e) => {
				videoContainer.muted = true;
				videoContainer.play();
			});
		}

		if (title) {
			titleContainer.html(title);
			titleContainer.removeClass('hidden');
		} else {
			titleContainer.addClass('hidden');
		}

		const darknessSetting = game.settings.get(
			constants.moduleName,
			SETTINGS.FULLSCREEN_DARKNESS_MODE
		);
		if (darknessSetting && game.scenes.current) {
			const currentScene = game.scenes.current;
			darknessContainer.css(
				'opacity',
				currentScene.environment.darknessLevel
			);
			darknessContainer.css(
				'background-color',
				`#${CONFIG.Canvas.darknessColor.toString(16)}`
			);
		}

		this.container.removeClass('hidden');
		this.container.removeClass('minimized');
		if (minimizeButton) {
			minimizeButton.removeClass('hidden');
		}
		if (maximizeButton) {
			maximizeButton.addClass('hidden');
		}

		try {
			ui.ARGON.toggle();
		} catch (e) {
			console.warn('ARGON module error', e);
		}
	}

	handleDismiss() {
		const background = this.container.find('.background');
		const img = this.container.find('img');
		const video = this.container.find('video');
		const videoContainer = video.get(0);
		const titleContainer = this.container.find('.title');
		const darknessContainer = this.container.find('.darkness');

		background.css(
			'background-image',
			`url("${constants.modulePath}/images/transparent.png")`
		);
		img.attr('src', `${constants.modulePath}/images/transparent.png`);
		videoContainer.pause();
		video.attr('src', '');

		titleContainer.html('');
		titleContainer.addClass('hidden');

		darknessContainer.css('opacity', 0);
		darknessContainer.css('background-color', 'transparent');

		this.container.addClass('hidden');
	}

	toggleMinimize(evt) {
		const minimizeButton = this.container.find('.minimize');
		const maximizeButton = this.container.find('.maximize');
		const titleContainer = this.container.find('.title');
		const darknessContainer = this.container.find('.darkness');
		minimizeButton.toggleClass('hidden');
		maximizeButton.toggleClass('hidden');
		titleContainer.toggleClass('hidden');
		darknessContainer.toggleClass('hidden');

		this.container.toggleClass('minimized');
	}

	updateDarkness(darkness) {
		const darknessSetting = game.settings.get(
			constants.moduleName,
			SETTINGS.FULLSCREEN_DARKNESS_MODE
		);

		if (darknessSetting && !this.container.hasClass('hidden')) {
			const darknessContainer = this.container.find('.darkness');
			darknessContainer.css('opacity', darkness);
			darknessContainer.css(
				'background-color',
				`#${CONFIG.Canvas.darknessColor.toString(16)}`
			);
		}
	}
}

/**
 * Create a singleton instance and export it
 */
const fullscreenLayer = new shareFullscreenLayer();
export default fullscreenLayer;

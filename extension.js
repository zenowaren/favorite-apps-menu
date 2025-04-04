import St from 'gi://St';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as AppFavorites from "resource:///org/gnome/shell/ui/appFavorites.js";
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

import {AppMenu} from 'resource:///org/gnome/shell/ui/appMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const LOCK = 0;
const LOGOUT = 1;
const RESTART = 2;
const SWITCH_USER = 3;
const SUSPEND = 4;
const POWEROFF = 5;

const APP_LOW_OPACITY = 125;

export default class FavoriteAppsMenu extends Extension {      
    constructor(metadata) {
        super(metadata);
    }
    
    enable() {
        this._settings = this.getSettings();

        this._indicator = new Indicator(this._settings);  

        Main.panel.addToStatusArea(this.uuid, this._indicator, this._settings.get_int('position-offset'), 'left');

        this._toggleActivitiesButton();

        this._settings.connectObject('changed::position-offset', () => this._resetPanel(), this);
        this._settings.connectObject('changed::left-mouse-button', () => this._resetPanel(), this);
        this._settings.connectObject('changed::middle-mouse-button', () => this._resetPanel(), this);
        this._settings.connectObject('changed::right-mouse-button', () => this._resetPanel(), this);
        this._settings.connectObject('changed::show-activities-button', () => this._toggleActivitiesButton(), this);
        Main.layoutManager.connectObject('monitors-changed', () => this._resetPanel(), this);
    }

    disable() { 
        Main.layoutManager.disconnectObject(this);

        this._resetActivitiesButtonVisibility();
        
        this._indicator?.destroy();
        this._indicator = null;
        this._settings.disconnectObject(this);
        this._settings = null;
    }

    _resetPanel(){
        this._indicator?.destroy();
        this._indicator = null;
        this._indicator = new Indicator(this._settings); 

        Main.panel.addToStatusArea(this.uuid, this._indicator, this._settings.get_int('position-offset'), 'left');

        this._toggleActivitiesButton();
    }   
    
    _toggleActivitiesButton() {
        if (Main.panel.statusArea.activities) {
            Main.panel.statusArea.activities.container.visible = this._getActivitiesButtonVisibility();
        }
    }

    _getActivitiesButtonVisibility() {
        return this._settings.get_boolean('show-activities-button');
    }

    _resetActivitiesButtonVisibility() {
        if (Main.panel.statusArea.activities) {
            Main.panel.statusArea.activities.container.visible = true;
        }
    }
}

const PanelMenuAppItem = GObject.registerClass(
class PanelMenuAppItem extends St.Bin {
    _init(app, iconSize) {
        super._init({
            reactive : true,
            can_focus : true,
            track_hover : true,
            style_class: 'button-view',
        });

        this._delegate = this;
        this._draggable = DND.makeDraggable(this, {dragActorOpacity: APP_LOW_OPACITY});

        this._app = app;
        this._app_id = app.id;
        this._iconSize = iconSize;
    }

    acceptDrop(source) {
        if (source && source._app_id) {
            this._index_in_favorites = AppFavorites.getAppFavorites()._getIds().indexOf(this._app_id);
            AppFavorites.getAppFavorites().moveFavoriteToPos(source._app_id, this._index_in_favorites);
            AppFavorites.getAppFavorites().emit('changed');
        }
        return true;
    }

    getDragActor() {
        return this._app.create_icon_texture(this._iconSize);
    }

    getDragActorSource() {
        return this;
    }
});

const PowerItems = GObject.registerClass(
    class PowerItems extends PopupMenu.PopupImageMenuItem {
        _init(ICON_NAME, ACCESSIBLE_NAME, ACTION, TAKE_ACTION) {
            super._init(ACCESSIBLE_NAME, ICON_NAME, {
                can_focus: true,
                hover: true,
                reactive: true,
            });

            const TakeAction = TAKE_ACTION;

            this.connect('button-release-event', () => {
                switch (ACTION) {
                case LOCK:
                    TakeAction.activateLockScreen();
                    break;
                case LOGOUT:
                    TakeAction.activateLogout();
                    break;
                case RESTART:
                    TakeAction.activateRestart();
                    break;
                case SWITCH_USER:
                    TakeAction.activateSwitchUser();
                    break;
                case SUSPEND:
                    TakeAction.activateSuspend();
                    break;
                case POWEROFF:
                    TakeAction.activatePowerOff();
                    break;
                }
            });
        }
    }
);

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
    _init(settings) {
        super._init(); 
        this.add_child(new St.Icon({
            icon_name: 'view-more-horizontal-symbolic', 
            style_class: 'system-status-icon',
        }));

        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this._menuManager._changeMenu = () => {};

        this._popupFavoriteAppsMenu = new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP);
        this._popupFavoriteAppsMenu._changeMenu = () => {};
        
        this._popupPowerItemsMenu = new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP);
        this._popupPowerItemsMenu._changeMenu = () => {};
        
        this._itemSection = new PopupMenu.PopupMenuSection();
        this._itemContextSection = new PopupMenu.PopupMenuSection();

        this._popupFavoriteAppsMenu.addMenuItem(this._itemSection);
        this._popupPowerItemsMenu.addMenuItem(this._itemContextSection);
        this._popupFavoriteAppsMenu.actor.hide();
        this._popupPowerItemsMenu.actor.hide();

        this._menuManager.addMenu(this._popupFavoriteAppsMenu);
        this._menuManager.addMenu(this._popupPowerItemsMenu);

        Main.uiGroup.add_child(this._popupFavoriteAppsMenu.actor);
        Main.uiGroup.add_child(this._popupPowerItemsMenu.actor);

        Shell.AppSystem.get_default().connectObject('installed-changed', () => this._loadFavoritesGrid(settings), this);
        AppFavorites.getAppFavorites().connectObject('changed', () => this._loadFavoritesGrid(settings), this);
        Main.extensionManager.connectObject('extension-state-changed', () => this._loadFavoritesGrid(settings), this);
        Main.layoutManager.connectObject('startup-complete',() => this._loadFavoritesGrid(settings), this);

        settings.connectObject('changed::icon-size', () => this._loadFavoritesGrid(settings), this);
        settings.connectObject('changed::number-of-columns', () => this._loadFavoritesGrid(settings), this);

        const lmb = settings.get_int('left-mouse-button');
        const mmb = settings.get_int('middle-mouse-button');
        const rmb = settings.get_int('right-mouse-button');

        this._loadFavoritesGrid(settings);

        if ([lmb, mmb, rmb].includes(4)) {
            this._createPowerPopupMenuContent();
        }

        this.connect('button-release-event', (actor, event) => {
            if (event.get_button() == Clutter.BUTTON_PRIMARY) {
                this._mouseButtonOptions(lmb);
            }else if (event.get_button() == Clutter.BUTTON_MIDDLE) {
                this._mouseButtonOptions(mmb);
            }else if (event.get_button() == Clutter.BUTTON_SECONDARY) {
                this._mouseButtonOptions(rmb);
            } 
            
            return Clutter.EVENT_PROPAGATE;
        });
      }

      _mouseButtonOptions(selection) {
        switch(selection) {
            case 0:
                console.log("Mouse button selection is off");
                break;
            case 1:
                this._popupFavoriteAppsMenu.toggle();
                break;
            case 2:
                if (Main.overview.visible) {
                    Main.overview.hide();
                }else {
                    Main.overview.showApps();
                }
                break;
            case 3:
                Main.overview.toggle();
                break;
            case 4:
                this._popupPowerItemsMenu.toggle();
                break;
            default:
                console.log("Invalid Selection");
        }
      }

    _activateApp(widget, event, app) {
        if (event.get_button() == Clutter.BUTTON_PRIMARY){
            if (app.can_open_new_window()) {
                this._popupFavoriteAppsMenu.close();
                app.open_new_window(-1);
            }
        }
    }

    _activateAppContextMenu(widget, event, app) {
         if (event.get_button() == Clutter.BUTTON_SECONDARY) {
            let contextMenuManager = new PopupMenu.PopupMenuManager(widget);
            let appContextMenu = new AppMenu(widget, St.Side.RIGHT, {favoritesSection: true, showSingleWindows: true,});
            appContextMenu.setApp(app);
               
            Main.uiGroup.add_child(appContextMenu.actor);
            contextMenuManager.addMenu(appContextMenu);
        
            appContextMenu.open();
            contextMenuManager.ignoreRelease();

            app.connectObject('windows-changed', () => {
                this._popupFavoriteAppsMenu.close();
            }); 
        }         
    }

    _onItemHover(widget) {
        if (widget.get_hover()) {
            widget.ease({
                duration: 100,
                opacity:255,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    widget.set_style_class_name('button-view-hover');
                }
            });
        }else {
            widget.ease({
                duration: 100,
                opacity:255,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () =>{
                     widget.set_style_class_name('button-view');
                }
            });
        }
    }
      
    _loadFavoritesGrid(_settings) {
        this._itemSection.actor.remove_all_children();

        const columnNumber = _settings.get_int('number-of-columns');
        const iconSize = _settings.get_int('icon-size');  
        const appFavoritesList = AppFavorites.getAppFavorites().getFavorites();
        let rowAdded = false;

        if(appFavoritesList.length > 0){
            const rowNumber = Math.ceil(appFavoritesList.length / columnNumber);
            let rowBox = {};
              
            for (let i = 0; i < rowNumber; i++) {
                rowBox[i] = new St.BoxLayout({vertical: false});
            }

            let count = 0;
            let nextLine = 0; 
                appFavoritesList.forEach(app => {
                this._draggableItem = new PanelMenuAppItem(app, iconSize);
                const appIcon = app.create_icon_texture(iconSize);

                this._draggableItem.set_child(appIcon); 
                this._draggableItemHoverSignal = this._draggableItem.connectObject('notify::hover', (widget, event) => this._onItemHover(widget), this);      
                this._draggableItemPressSignal = this._draggableItem.connectObject('button-press-event', (widget, event) => this._activateAppContextMenu(widget, event, app), this); 
                this._draggableItemReleaseSignal = this._draggableItem.connectObject('button-release-event', (widget, event) => this._activateApp(widget, event, app), this); 

                rowBox[nextLine].add_child(this._draggableItem);

                if(!rowAdded){
                    this._itemSection.actor.add_child(rowBox[nextLine]);
                    rowAdded = true;
                }
                
                count += 1;
                if(count == columnNumber) {      
                    nextLine += 1;
                    count = 0;
                    rowAdded = false;
                }
            });  
        }else {
            const menuItem = new PopupMenu.PopupMenuItem('Your favorite apps appear here. Pin an app to the Dash.');
            this._itemSection.actor.add_child(menuItem);
        }
    }

    _createPowerPopupMenuContent() {
        this._itemContextSection.actor.remove_all_children();

        const TakeAction = SystemActions.getDefault();

        const powerItemsData = [];

        if (TakeAction.canLockScreen)
        powerItemsData.push(['system-lock-screen-symbolic', 'Lock', LOCK, TakeAction]);

        if (TakeAction.canLogout)
        powerItemsData.push(['system-log-out-symbolic', 'Log Out', LOGOUT, TakeAction]);

        if (TakeAction.canRestart)
        powerItemsData.push(['system-reboot-symbolic', 'Restart', RESTART, TakeAction]);

        if (TakeAction.canSwitchUser)
        powerItemsData.push(['system-switch-user-symbolic', 'Switch User', SWITCH_USER, TakeAction]);

        if (TakeAction.canSuspend)
        powerItemsData.push(['media-playback-pause-symbolic', 'Suspend', SUSPEND, TakeAction]);

        if (TakeAction.canPowerOff)
        powerItemsData.push(['system-shutdown-symbolic', 'Power Off', POWEROFF, TakeAction]);

        this._powerMenuContainer = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            vertical: true
        });

        this._powerItems = {};

        for (const [icon, label, action, takeAction] of powerItemsData) {
            this._powerItems[action] = new PowerItems(icon, label, action, takeAction);
        }

        for (const item of Object.values(this._powerItems)) {
            this._powerMenuContainer.add_child(item);
        }

        this._itemContextSection.actor.add_child(this._powerMenuContainer);
    }
});

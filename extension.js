import St from 'gi://St';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as AppFavorites from "resource:///org/gnome/shell/ui/appFavorites.js";

import {AppMenu} from 'resource:///org/gnome/shell/ui/appMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

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

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.5, this.uuid); 

        this.add_child(new St.Icon({icon_name: 'view-more-horizontal-symbolic.svg', style_class: 'system-status-icon'}));

        this._itemSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._itemSection);

        Shell.AppSystem.get_default().connectObject('installed-changed', () => this._loadFavoritesGrid(settings), this);
        AppFavorites.getAppFavorites().connectObject('changed', () => this._loadFavoritesGrid(settings), this);
        Main.extensionManager.connectObject('extension-state-changed', () => this._loadFavoritesGrid(settings), this);
        Main.layoutManager.connectObject('startup-complete',() => this._loadFavoritesGrid(settings), this);

        settings.connectObject('changed::icon-size', () => this._loadFavoritesGrid(settings), this);
        settings.connectObject('changed::number-of-columns', () => this._loadFavoritesGrid(settings), this);

        this._loadFavoritesGrid(settings);
      }

    vfunc_event(event) {
        if (this.menu && (event.type() == Clutter.EventType.TOUCH_END || event.type() == Clutter.EventType.BUTTON_RELEASE)){
            if (event.get_button() == Clutter.BUTTON_PRIMARY) {
                this.menu.toggle();
            }

            if (event.get_button() == Clutter.BUTTON_MIDDLE) {
                if (Main.overview.visible) {
                    Main.overview.hide();
                }else {
                    Main.overview.showApps();
                }
            }

            if (event.get_button() == Clutter.BUTTON_SECONDARY) {
                Main.overview.toggle();
            }
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _activateApp(widget, event, app) {
        if (event.get_button() == Clutter.BUTTON_PRIMARY){
            if (app.can_open_new_window()) {
                this.menu.close();
                app.open_new_window(-1);
            }
        }
    }

    _activateContextMenu(widget, event, app) {
         if (event.get_button() == Clutter.BUTTON_SECONDARY) {
            let contextMenuManager = new PopupMenu.PopupMenuManager(widget);
            let appContextMenu = new AppMenu(widget, St.Side.RIGHT, {favoritesSection: true, showSingleWindows: true,});
            appContextMenu.setApp(app);
               
            Main.uiGroup.add_child(appContextMenu.actor);
            contextMenuManager.addMenu(appContextMenu);
        
            appContextMenu.open();
            contextMenuManager.ignoreRelease();

            app.connectObject('windows-changed', () => {
                this.menu.close();
            }); 
        }         
    }

    _onItemHover(widget) {
        if (widget.get_hover()) {
            widget.ease({
                duration: 100,
                opacity:255,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => widget.set_style_class_name('button-view-hover'),
            });
        }else {
            widget.ease({
                duration: 100,
                opacity:255,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => widget.set_style_class_name('button-view'),
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
                let draggableItem = new PanelMenuAppItem(app, iconSize);
                const appIcon = app.create_icon_texture(iconSize);         

                draggableItem.set_child(appIcon); 
                draggableItem.connectObject('notify::hover', (widget, event) => this._onItemHover(widget), this);      
                draggableItem.connectObject('button-press-event', (widget, event) => this._activateContextMenu(widget, event, app), this); 
                draggableItem.connectObject('button-release-event', (widget, event) => this._activateApp(widget, event, app), this); 

                rowBox[nextLine].add_child(draggableItem);

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
});

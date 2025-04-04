import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import {ExtensionPreferences} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const actionSelection = ["Off", "Favorite Apps Menu", "Gnome Applications", "Gnome Activities", "Power Menu"];

export default class FavoritesPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(600, 660);
        
        const page = new Adw.PreferencesPage();

        const group = new Adw.PreferencesGroup({
            title: "Panel",
        });

        const groupGrid = new Adw.PreferencesGroup({
            title: "View",
        });

        const groupMouse = new Adw.PreferencesGroup({
            title: "Mouse",
        });       

        page.add(group);     
        page.add(groupGrid); 
        page.add(groupMouse); 

        //Position Offset
        const positionOffset = new Adw.ActionRow({
            title: "Position Offset",
        });

        group.add(positionOffset);
        
        const positionOffsetAdjustment = new Gtk.Adjustment({       
          lower: 0,
          upper: 10,
          step_increment: 1,
          page_increment: 1,
          page_size: 0,
        });
        
        const positionOffsetButton = new Gtk.SpinButton({
          adjustment: positionOffsetAdjustment,
          climb_rate: 5,
          digits: 0,
          numeric: true,
          valign: Gtk.Align.CENTER,
        });
        
        positionOffsetButton.set_value(settings.get_int("position-offset"));
        
        positionOffsetButton.connect('value-changed', widget => {
          settings.set_int('position-offset', widget.get_value());
        });  
        
        settings.bind("position-offset", positionOffsetButton, "value", Gio.SettingsBindFlags.DEFAULT);
        positionOffset.add_suffix(positionOffsetButton);
        positionOffset.activatable_widget = positionOffsetButton;

        //Toggle Activities
        const rowActivities = new Adw.ActionRow({
            title: "Show Activities Button",
        });
        group.add(rowActivities);
        
        const toggleActivities = new Gtk.Switch({
            active: settings.get_boolean("show-activities-button"),
            valign: Gtk.Align.CENTER,
        });
        
        toggleActivities.connect('notify::selected', widget => {
            settings.set_boolean('show-activities-button', widget.get_active());
        });   
        
        settings.bind("show-activities-button", toggleActivities, "active", Gio.SettingsBindFlags.DEFAULT);

        rowActivities.add_suffix(toggleActivities);
        rowActivities.activatable_widget = toggleActivities;      

        //Icon Size
        const iconSize = new Adw.ActionRow({
            title: "Icon Size",
        });  

        groupGrid.add(iconSize);
        
        const iconSizeAdjustment = new Gtk.Adjustment({
            lower: 40,
            upper: 80,
            step_increment: 1,
            page_increment: 1,
            page_size: 0,
        });
        
        const iconSizeSpinButton = new Gtk.SpinButton({
            adjustment: iconSizeAdjustment,
            climb_rate: 5,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
        });
        
        iconSizeSpinButton.set_value(settings.get_int("icon-size"));
        
        iconSizeSpinButton.connect('value-changed', widget => {
           settings.set_int('icon-size', widget.get_value());
        });  
        
        settings.bind("icon-size", iconSizeSpinButton, "value", Gio.SettingsBindFlags.DEFAULT);
        iconSize.add_suffix(iconSizeSpinButton);
        iconSize.activatable_widget = iconSizeSpinButton;
        
        //Number of Columns
        const numberOfColumns = new Adw.ActionRow({
            title: "Number of Columns",
        });

        groupGrid.add(numberOfColumns);
        
        const nocAdjustment = new Gtk.Adjustment({
            lower: 1,
            upper: 10,
            step_increment: 1,
            page_increment: 1,
            page_size: 0,
        });
        
        const nocSpinButton = new Gtk.SpinButton({
          adjustment: nocAdjustment,
          climb_rate: 5,
          digits: 0,
          numeric: true,
          valign: Gtk.Align.CENTER,
        });
        
        nocSpinButton.set_value(settings.get_int("number-of-columns"));
        
        nocSpinButton.connect('value-changed', widget => {
            settings.set_int('number-of-columns', widget.get_value());
        }); 
        
        settings.bind("number-of-columns", nocSpinButton, "value", Gio.SettingsBindFlags.DEFAULT);
        numberOfColumns.add_suffix(nocSpinButton);
        numberOfColumns.activatable_widget = nocSpinButton;

        //Left Mouse Button Action
        const leftMouseClick = new Adw.ActionRow({
            title: "Left Button",
        });  

        groupMouse.add(leftMouseClick);
        
        const dropdownLMB = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: Gtk.StringList.new(actionSelection),
            selected: settings.get_int("left-mouse-button"),
        });
        
        dropdownLMB.connect('notify::selected', widget => {
            settings.set_int('left-mouse-button', widget.selected);
        });
        
        settings.bind("left-mouse-button", dropdownLMB, "selected", Gio.SettingsBindFlags.DEFAULT);

        leftMouseClick.add_suffix(dropdownLMB);
        leftMouseClick.activatable_widget = dropdownLMB; 

        //Middle Mouse Button Action
        const middleMouseClick = new Adw.ActionRow({
            title: "Middle Button",
        });  

        groupMouse.add(middleMouseClick);
        
        const dropdownMMB = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: Gtk.StringList.new(actionSelection),
            selected: settings.get_int("middle-mouse-button"),
        });
        
        dropdownMMB.connect('notify::selected', widget => {
            settings.set_int('middle-mouse-button', widget.selected);
        });
        
        settings.bind("middle-mouse-button", dropdownMMB, "selected", Gio.SettingsBindFlags.DEFAULT);

        middleMouseClick.add_suffix(dropdownMMB);
        middleMouseClick.activatable_widget = dropdownMMB; 

        //Right Mouse Button Action
        const rightMouseClick = new Adw.ActionRow({
            title: "Right Button",
        });  

        groupMouse.add(rightMouseClick);
        
        const dropdownRMB = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: Gtk.StringList.new(actionSelection),
            selected: settings.get_int("right-mouse-button"),
        });
        
        dropdownRMB.connect('notify::selected', widget => {
            settings.set_int('right-mouse-button', widget.selected);
        });
        
        settings.bind("right-mouse-button", dropdownRMB, "selected", Gio.SettingsBindFlags.DEFAULT);

        rightMouseClick.add_suffix(dropdownRMB);
        rightMouseClick.activatable_widget = dropdownRMB; 

        window.add(page);
    }
}

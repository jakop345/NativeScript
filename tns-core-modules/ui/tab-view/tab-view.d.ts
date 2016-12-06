﻿/**
 * Contains the TabView class, which represents a standard content component with tabs.
 */
declare module "ui/tab-view" {
    import { View, Bindable, Property, EventData, Color } from "ui/core/view";
    
    /**
     * Represents a tab view entry.
     */
    class TabViewItem extends Bindable {
        /**
         * Gets or sets the title of the TabViewItem.
         */
        public title: string;

        /**
         * Gets or sets the view of the TabViewItem.
         */
        public view: View;

        /**
         * Gets or sets the icon source of the TabViewItem. This could either be a a file name or resource id.
         */
        public iconSource: string;
    }

    /**
     * Defines the data for the TabView.selectedIndexChanged event.
     */
    export interface SelectedIndexChangedEventData extends EventData {
        /**
         * The old selected index.
         */
        oldIndex: number;

        /**
         * The new selected index.
         */
        newIndex: number;
    }

    /**
     * Represents a tab view.
     */
    class TabView extends View {
        /**
         * Gets or sets the items of the TabView.
         */
        items: Array<TabViewItem>;

        /**
         * Gets or sets the selectedIndex of the TabView.
         */
        selectedIndex: number;

        /**
         * Gets or sets the color used for selected item.
         */
        selectedColor: Color;

        /**
         * Gets or sets the color used for background of the tab items.
         */
        tabsBackgroundColor: Color;

        /**
         * Gets the native [android widget](http://developer.android.com/reference/android/support/v4/view/ViewPager.html) that represents the user interface for this component. Valid only when running on Android OS.
         */
        android: any /* android.view.View */;//android.support.v4.view.ViewPager;

        /**
         * Gets the native iOS [UITabBarController](https://developer.apple.com/library/ios/documentation/UIKit/Reference/UITabBarController_Class/) that represents the user interface for this component. Valid only when running on iOS.
         */
        ios: any /* UITabBarController */;

        /**
         * String value used when hooking to the selectedIndexChanged event.
         */
        public static selectedIndexChangedEvent: string;

        /**
         * A basic method signature to hook an event listener (shortcut alias to the addEventListener method).
         * @param eventNames - String corresponding to events (e.g. "propertyChange"). Optionally could be used more events separated by `,` (e.g. "propertyChange", "change"). 
         * @param callback - Callback function which will be executed when event is raised.
         * @param thisArg - An optional parameter which will be used as `this` context for callback execution.
         */
        on(eventNames: string, callback: (data: EventData) => void, thisArg?: any);

        /**
         * Raised when the selected index changes.
         */
        on(event: "selectedIndexChanged", callback: (args: SelectedIndexChangedEventData) => void, thisArg?: any);
    }

        export const itemsProperty: Property<TabView, TabViewItem[]>;
        export const selectedIndexProperty: Property<TabView, number>;
        export const selectedColorProperty: Property<TabView, Color>;
        export const tabsBackgroundColorProperty: Property<TabView, Color>;
}
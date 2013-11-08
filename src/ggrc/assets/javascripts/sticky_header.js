/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: andy@reciprocitylabs.com
    Maintained By: andy@reciprocitylabs.com
*/


(function(can, $) {

can.Control("StickyHeader", {
    defaults: {
        // A selector for the scrollable area ancestor
        scroll_area_selector: ".object-area"
        // A selector for all sticky-able headers
      , header_selector: ".header"
                      +", .tree-open > .item-open > .item-main"
                      +", .tree-open > .item-open > .item-content > .inner-tree > h6"
                      +", .tree-open > .item-open > .item-content > .inner-tree > .tree-structure > .advanced-filters"
                      +", .advanced-filters"
        // A selector for all sticky-able footers
      , footer_selector: ".tree-footer"
        // A selector for counting the depth
        // Generally this should be header_selector with the final element in each selector removed
      , depth_selector: ".tree-open > .item-open"
                      +", .tree-open > .item-open > .item-content > .inner-tree"
                      +", .tree-open > .item-open > .item-content > .inner-tree > .tree-structure"
        // The amount of space at the bottom of the content when the header should start scrolling away
      , margin: 30
    }
}, {
    init : function() {
      this.options = can.extend(this.options, {
        scroll_area: this.element.closest(this.options.scroll_area_selector)
      });
      this.on();
    }

    // Handle window scrolling
  , "{scroll_area} scroll" : function(el, ev) {
    // Only process if this section is visible
    if (!this.element.is(":visible"))
      return;

    // Update the header/footer positions
    this.update_items('header');
    this.update_items('footer');
  }

    // Resize clones on window resize
  , "{window} resize" : function(el, ev) {
    // Update the header/footer positions
    this.update_items('header');
    this.update_items('footer');
  }

    // Updates the given set of sticky items
  , update_items : function(type) {
    var items = this.find_items(type);

    for (var i = items.length - 1; i >= 0; i--) {
      var el = items.eq(i)
        , clone = this.clone(el)
        , margin = el.data('sticky').margin
        ;

      // Remove the clone if its content no longer inside the viewport
      if (margin === false) {
        this.remove(el);
      }
      // Otherwise inject the clone
      else {
        !clone[0].parentNode && el.parent().append(clone);

        // When the content is close to scrolling away, also scroll the header away
        clone.css('margin' + (type === 'footer' ? 'Bottom' : 'Top'), margin + 'px');
      }
    }
  }

    // Find all sticky-able headers in the document
  , find_items : function(type) {
    var old_items = this['_'+type] || $()
      , items = this['_'+type] = this.element.find(this.options[type + '_selector']).filter(':not(.sticky):visible')
      , self = this
      , increment = type === 'footer' ? -1 : 1
      , i = type === 'footer' ? items.length - 1 : 0
      ;

    // Remove all items that no longer are active
    old_items.not(items).each(function() {
      self.remove($(this));
    });

    // Generate the depth and clone for each header
    for (var $this; $this = items[i]; i += increment) {
      $this = $($this);

      if (!$this.data('sticky')) {
        var data = {
            type: type
          , depth: $this.parents(self.options.depth_selector).length
        };
        $this.data('sticky', data);
      }

      self.compute_offset($this, type === 'footer' ? items.slice(i) : items.slice(0, i));
      self.in_viewport($this);
    }

    return items;
  }

    // Determine whether a header's content section is within the scrolling viewport
  , in_viewport : function(el) {
    var data = el.data('sticky')
      , type = data.type
      , parent = el.parent()
      , offset = data.offset
      , pos = parent.position().top
      , height = el.outerHeight()
        // If the header is taller than the margin, it'll disappear early instead of scrolling away smoothly
      , global_margin = Math.max(this.options.margin, height)
      , margin = pos + parent.outerHeight() - height
      , scroll_height = this.options.scroll_area.outerHeight()
      ;

    if (type === 'footer') {
      offset = scroll_height - data.offset;
      margin = offset - pos - height;
    }

    // If the content is in the viewport...
    if (type === 'header' && pos < offset && margin > offset) {
      // Return zero or the amount that the header should start scrolling away if applicable
      margin -= offset;
      return data.margin = margin <= global_margin ? -Math.max(0, global_margin - margin) : 0;
    }
    else if (type === 'footer' && pos < scroll_height && (el.position().top + height) > offset && margin > 0) {
      return data.margin = margin <= global_margin ? -Math.max(0, global_margin - margin) : 0;
    }
    else
      return data.margin = false;
  }

  , compute_offset : function(el, items) {
    // Compute heights of above items
    var offset = 0
      , data = el.data('sticky')
      , depths = {}
      , selector = this.selector_of(el, data.type)
      , increment = data.type === 'footer' ? -1 : 1
      , i = data.type === 'footer' ? items.length - 1 : 0
      ;

    // Determine the offset based on nested parents
    var increments = [];
    for (var $this; $this = items[i]; i += increment) {
      if (el[0] === $this) {
        break;
      }
      else {
        $this = $($this);
        var sibling_data = $this.data('sticky')
          , depth = sibling_data.depth
          , depth_selector = this.selector_of($this, data.type) + depth
          ;

        // Only add offsets for the closest nested parent of the given depth
        // as well as offsets for the first adjacent sibling of different selectors
        if (sibling_data.margin !== false && ((!depths[depth] && depth < data.depth) 
          || (depth <= data.depth && !$this.is(selector) && !depths[depth_selector]))) {
            increments.push($this.outerHeight() + ' ' + sibling_data.margin);
            increments.push($this[0]);
            offset += $this.outerHeight();
            depths[depth] = true;
            depths[depth_selector] = true;
        }
      }
    }

    return data.offset = offset;
  }

    // Clones (if one doesn't exist) and prepares an item
  , clone : function(el) {
    // Compute heights of above items
    var data = el.data('sticky');
    data.clone = data.clone || el.clone(true, true).addClass("sticky sticky-" + data.type);
    return this.position_clone(el);
  }

    // Determine the selector that "selected" a given element
  , selector_of : function(el, type) {
    var selector = '';
    can.each(this.options[type + '_selector'].split(','), function(part) {
      if (el.is(part))
        selector = part;
    });
    return selector;
  }

    // Reposition a clone
  , position_clone : function(el) {
    var data = el.data('sticky');
    return data.clone.css({
          position: 'fixed'
        , left: el.offset().left + 'px'
        , width: (el[0].getBoundingClientRect().width
            - parseFloat(el.css('paddingLeft')) 
            - parseFloat(el.css('paddingRight'))) 
            + 'px'
      }).css(
          data.type === 'footer' ? 'bottom' : 'top'
          , (
              data.type === 'footer'
              ? data.offset + $(window).height() - this.options.scroll_area.outerHeight() - parseFloat(this.options.scroll_area.position().top)
              : data.offset + parseFloat(this.options.scroll_area.position().top)
            ) + 'px'
      );
  }

    // Detach an element's sticky data
  , remove : function(el) {
    var clone = el.data('sticky').clone;
    if (clone && clone[0] && clone[0].parentNode) {
      clone.remove();
    }
    $.removeData(el, 'sticky');
  }

    // Clean up when destroyed
  , destroy : function() {
    var items = $().add(this._header || $()).add(this._footer || $())
      , self = this
      ;
    items.each(function() {
      self.destroy($(this));
    });
    delete this._header;
    delete this._footer;
  }
});

})(this.can, this.can.$);

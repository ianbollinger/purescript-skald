(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":8}],2:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":25}],3:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":27}],4:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],5:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],6:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":11}],7:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":16,"is-object":4}],8:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":14,"../vnode/is-vnode.js":17,"../vnode/is-vtext.js":18,"../vnode/is-widget.js":19,"./apply-properties":7,"global/document":3}],9:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],10:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":19,"../vnode/vpatch.js":22,"./apply-properties":7,"./update-widget":12}],11:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":8,"./dom-index":9,"./patch-op":10,"global/document":3,"x-is-array":5}],12:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":19}],13:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],14:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":15,"./is-vnode":17,"./is-vtext":18,"./is-widget":19}],15:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],16:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],17:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":20}],18:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":20}],19:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],20:[function(require,module,exports){
module.exports = "2"

},{}],21:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":15,"./is-vhook":16,"./is-vnode":17,"./is-widget":19,"./version":20}],22:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":20}],23:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":20}],24:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":16,"is-object":4}],25:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":14,"../vnode/is-thunk":15,"../vnode/is-vnode":17,"../vnode/is-vtext":18,"../vnode/is-widget":19,"../vnode/vpatch":22,"./diff-props":24,"x-is-array":5}],26:[function(require,module,exports){
// Generated by psc-bundle 0.9.1
var PS = {};
(function(exports) {
    "use strict";

  // module Data.Functor

  exports.arrayMap = function (f) {
    return function (arr) {
      var l = arr.length;
      var result = new Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(arr[i]);
      }
      return result;
    };
  };
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Semigroupoid = function (compose) {
      this.compose = compose;
  };
  var semigroupoidFn = new Semigroupoid(function (f) {
      return function (g) {
          return function (x) {
              return f(g(x));
          };
      };
  });
  var compose = function (dict) {
      return dict.compose;
  };
  exports["Semigroupoid"] = Semigroupoid;
  exports["compose"] = compose;
  exports["semigroupoidFn"] = semigroupoidFn;
})(PS["Control.Semigroupoid"] = PS["Control.Semigroupoid"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var Category = function (__superclass_Control$dotSemigroupoid$dotSemigroupoid_0, id) {
      this["__superclass_Control.Semigroupoid.Semigroupoid_0"] = __superclass_Control$dotSemigroupoid$dotSemigroupoid_0;
      this.id = id;
  };
  var id = function (dict) {
      return dict.id;
  };
  var categoryFn = new Category(function () {
      return Control_Semigroupoid.semigroupoidFn;
  }, function (x) {
      return x;
  });
  exports["Category"] = Category;
  exports["id"] = id;
  exports["categoryFn"] = categoryFn;
})(PS["Control.Category"] = PS["Control.Category"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Category = PS["Control.Category"];
  var flip = function (f) {
      return function (b) {
          return function (a) {
              return f(a)(b);
          };
      };
  };
  var $$const = function (a) {
      return function (v) {
          return a;
      };
  };
  var applyFlipped = function (x) {
      return function (f) {
          return f(x);
      };
  };
  var apply = function (f) {
      return function (x) {
          return f(x);
      };
  };
  exports["apply"] = apply;
  exports["applyFlipped"] = applyFlipped;
  exports["const"] = $$const;
  exports["flip"] = flip;
})(PS["Data.Function"] = PS["Data.Function"] || {});
(function(exports) {
    "use strict";

  // module Data.Unit

  exports.unit = {};
})(PS["Data.Unit"] = PS["Data.Unit"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Unit"];
  var Data_Show = PS["Data.Show"];
  exports["unit"] = $foreign.unit;
})(PS["Data.Unit"] = PS["Data.Unit"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var Functor = function (map) {
      this.map = map;
  };
  var map = function (dict) {
      return dict.map;
  };
  var $$void = function (dictFunctor) {
      return map(dictFunctor)(Data_Function["const"](Data_Unit.unit));
  };
  var voidLeft = function (dictFunctor) {
      return function (f) {
          return function (x) {
              return map(dictFunctor)(Data_Function["const"](x))(f);
          };
      };
  };
  var voidRight = function (dictFunctor) {
      return function (x) {
          return map(dictFunctor)(Data_Function["const"](x));
      };
  };
  var functorFn = new Functor(Control_Semigroupoid.compose(Control_Semigroupoid.semigroupoidFn));
  var functorArray = new Functor($foreign.arrayMap);
  exports["Functor"] = Functor;
  exports["map"] = map;
  exports["void"] = $$void;
  exports["voidLeft"] = voidLeft;
  exports["voidRight"] = voidRight;
  exports["functorFn"] = functorFn;
  exports["functorArray"] = functorArray;
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
    "use strict";

  exports.concatArray = function (xs) {
    return function (ys) {
      return xs.concat(ys);
    };
  };
})(PS["Data.Semigroup"] = PS["Data.Semigroup"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Semigroup"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Void = PS["Data.Void"];        
  var Semigroup = function (append) {
      this.append = append;
  };                                                         
  var semigroupArray = new Semigroup($foreign.concatArray);
  var append = function (dict) {
      return dict.append;
  };
  exports["Semigroup"] = Semigroup;
  exports["append"] = append;
  exports["semigroupArray"] = semigroupArray;
})(PS["Data.Semigroup"] = PS["Data.Semigroup"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_Functor = PS["Data.Functor"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var Alt = function (__superclass_Data$dotFunctor$dotFunctor_0, alt) {
      this["__superclass_Data.Functor.Functor_0"] = __superclass_Data$dotFunctor$dotFunctor_0;
      this.alt = alt;
  };                                                       
  var alt = function (dict) {
      return dict.alt;
  };
  exports["Alt"] = Alt;
  exports["alt"] = alt;
})(PS["Control.Alt"] = PS["Control.Alt"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Control_Category = PS["Control.Category"];        
  var Apply = function (__superclass_Data$dotFunctor$dotFunctor_0, apply) {
      this["__superclass_Data.Functor.Functor_0"] = __superclass_Data$dotFunctor$dotFunctor_0;
      this.apply = apply;
  };                      
  var apply = function (dict) {
      return dict.apply;
  };
  var applySecond = function (dictApply) {
      return function (a) {
          return function (b) {
              return apply(dictApply)(Data_Functor.map(dictApply["__superclass_Data.Functor.Functor_0"]())(Data_Function["const"](Control_Category.id(Control_Category.categoryFn)))(a))(b);
          };
      };
  };
  exports["Apply"] = Apply;
  exports["apply"] = apply;
  exports["applySecond"] = applySecond;
})(PS["Control.Apply"] = PS["Control.Apply"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Apply = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Unit = PS["Data.Unit"];        
  var Applicative = function (__superclass_Control$dotApply$dotApply_0, pure) {
      this["__superclass_Control.Apply.Apply_0"] = __superclass_Control$dotApply$dotApply_0;
      this.pure = pure;
  };
  var pure = function (dict) {
      return dict.pure;
  };
  var when = function (dictApplicative) {
      return function (v) {
          return function (v1) {
              if (v) {
                  return v1;
              };
              if (!v) {
                  return pure(dictApplicative)(Data_Unit.unit);
              };
              throw new Error("Failed pattern match at Control.Applicative line 58, column 1 - line 58, column 16: " + [ v.constructor.name, v1.constructor.name ]);
          };
      };
  };
  var liftA1 = function (dictApplicative) {
      return function (f) {
          return function (a) {
              return Control_Apply.apply(dictApplicative["__superclass_Control.Apply.Apply_0"]())(pure(dictApplicative)(f))(a);
          };
      };
  };
  exports["Applicative"] = Applicative;
  exports["liftA1"] = liftA1;
  exports["pure"] = pure;
  exports["when"] = when;
})(PS["Control.Applicative"] = PS["Control.Applicative"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Category = PS["Control.Category"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];        
  var Bind = function (__superclass_Control$dotApply$dotApply_0, bind) {
      this["__superclass_Control.Apply.Apply_0"] = __superclass_Control$dotApply$dotApply_0;
      this.bind = bind;
  };                     
  var bind = function (dict) {
      return dict.bind;
  };
  var bindFlipped = function (dictBind) {
      return Data_Function.flip(bind(dictBind));
  };
  var composeKleisliFlipped = function (dictBind) {
      return function (f) {
          return function (g) {
              return function (a) {
                  return bindFlipped(dictBind)(f)(g(a));
              };
          };
      };
  };
  exports["Bind"] = Bind;
  exports["bind"] = bind;
  exports["bindFlipped"] = bindFlipped;
  exports["composeKleisliFlipped"] = composeKleisliFlipped;
})(PS["Control.Bind"] = PS["Control.Bind"] || {});
(function(exports) {
    "use strict";

  // module Unsafe.Coerce

  exports.unsafeCoerce = function (x) {
    return x;
  };
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Unsafe.Coerce"];
  exports["unsafeCoerce"] = $foreign.unsafeCoerce;
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Unsafe_Coerce = PS["Unsafe.Coerce"];        
  var runExists = Unsafe_Coerce.unsafeCoerce;
  var mkExists = Unsafe_Coerce.unsafeCoerce;
  exports["mkExists"] = mkExists;
  exports["runExists"] = runExists;
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Functor = PS["Data.Functor"];        
  var Monad = function (__superclass_Control$dotApplicative$dotApplicative_0, __superclass_Control$dotBind$dotBind_1) {
      this["__superclass_Control.Applicative.Applicative_0"] = __superclass_Control$dotApplicative$dotApplicative_0;
      this["__superclass_Control.Bind.Bind_1"] = __superclass_Control$dotBind$dotBind_1;
  };
  var ap = function (dictMonad) {
      return function (f) {
          return function (a) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(f)(function (v) {
                  return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(a)(function (v1) {
                      return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(v(v1));
                  });
              });
          };
      };
  };
  exports["Monad"] = Monad;
  exports["ap"] = ap;
})(PS["Control.Monad"] = PS["Control.Monad"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Category = PS["Control.Category"];        
  var Bifunctor = function (bimap) {
      this.bimap = bimap;
  };
  var bimap = function (dict) {
      return dict.bimap;
  };
  var rmap = function (dictBifunctor) {
      return bimap(dictBifunctor)(Control_Category.id(Control_Category.categoryFn));
  };
  exports["Bifunctor"] = Bifunctor;
  exports["bimap"] = bimap;
  exports["rmap"] = rmap;
})(PS["Data.Bifunctor"] = PS["Data.Bifunctor"] || {});
(function(exports) {
    "use strict";

  // module Data.Eq

  exports.refEq = function (r1) {
    return function (r2) {
      return r1 === r2;
    };
  };
})(PS["Data.Eq"] = PS["Data.Eq"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Eq"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Void = PS["Data.Void"];        
  var Eq = function (eq) {
      this.eq = eq;
  }; 
  var eqString = new Eq($foreign.refEq); 
  var eq = function (dict) {
      return dict.eq;
  };
  exports["Eq"] = Eq;
  exports["eq"] = eq;
  exports["eqString"] = eqString;
})(PS["Data.Eq"] = PS["Data.Eq"] || {});
(function(exports) {
    "use strict";

  exports.foldrArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = len - 1; i >= 0; i--) {
          acc = f(xs[i])(acc);
        }
        return acc;
      };
    };
  };

  exports.foldlArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = 0; i < len; i++) {
          acc = f(acc)(xs[i]);
        }
        return acc;
      };
    };
  };
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Alt = PS["Control.Alt"];
  var Data_Functor = PS["Data.Functor"];        
  var Plus = function (__superclass_Control$dotAlt$dotAlt_0, empty) {
      this["__superclass_Control.Alt.Alt_0"] = __superclass_Control$dotAlt$dotAlt_0;
      this.empty = empty;
  };       
  var empty = function (dict) {
      return dict.empty;
  };
  exports["Plus"] = Plus;
  exports["empty"] = empty;
})(PS["Control.Plus"] = PS["Control.Plus"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_Function = PS["Data.Function"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Unit = PS["Data.Unit"];        
  var Monoid = function (__superclass_Data$dotSemigroup$dotSemigroup_0, mempty) {
      this["__superclass_Data.Semigroup.Semigroup_0"] = __superclass_Data$dotSemigroup$dotSemigroup_0;
      this.mempty = mempty;
  };     
  var monoidArray = new Monoid(function () {
      return Data_Semigroup.semigroupArray;
  }, [  ]);
  var mempty = function (dict) {
      return dict.mempty;
  };
  exports["Monoid"] = Monoid;
  exports["mempty"] = mempty;
  exports["monoidArray"] = monoidArray;
})(PS["Data.Monoid"] = PS["Data.Monoid"] || {});
(function(exports) {
    "use strict";

  // module Data.Ord.Unsafe

  exports.unsafeCompareImpl = function (lt) {
    return function (eq) {
      return function (gt) {
        return function (x) {
          return function (y) {
            return x < y ? lt : x > y ? gt : eq;
          };
        };
      };
    };
  };
})(PS["Data.Ord.Unsafe"] = PS["Data.Ord.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_Eq = PS["Data.Eq"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];        
  var LT = (function () {
      function LT() {

      };
      LT.value = new LT();
      return LT;
  })();
  var GT = (function () {
      function GT() {

      };
      GT.value = new GT();
      return GT;
  })();
  var EQ = (function () {
      function EQ() {

      };
      EQ.value = new EQ();
      return EQ;
  })();
  exports["LT"] = LT;
  exports["GT"] = GT;
  exports["EQ"] = EQ;
})(PS["Data.Ordering"] = PS["Data.Ordering"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Ord.Unsafe"];
  var Data_Ordering = PS["Data.Ordering"];        
  var unsafeCompare = $foreign.unsafeCompareImpl(Data_Ordering.LT.value)(Data_Ordering.EQ.value)(Data_Ordering.GT.value);
  exports["unsafeCompare"] = unsafeCompare;
})(PS["Data.Ord.Unsafe"] = PS["Data.Ord.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Ord"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Ord_Unsafe = PS["Data.Ord.Unsafe"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Void = PS["Data.Void"];
  var Data_Semiring = PS["Data.Semiring"];        
  var Ord = function (__superclass_Data$dotEq$dotEq_0, compare) {
      this["__superclass_Data.Eq.Eq_0"] = __superclass_Data$dotEq$dotEq_0;
      this.compare = compare;
  }; 
  var ordString = new Ord(function () {
      return Data_Eq.eqString;
  }, Data_Ord_Unsafe.unsafeCompare);
  var compare = function (dict) {
      return dict.compare;
  };
  exports["Ord"] = Ord;
  exports["compare"] = compare;
  exports["ordString"] = ordString;
})(PS["Data.Ord"] = PS["Data.Ord"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Monad = PS["Control.Monad"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Category = PS["Control.Category"];        
  var Just = (function () {
      function Just(value0) {
          this.value0 = value0;
      };
      Just.create = function (value0) {
          return new Just(value0);
      };
      return Just;
  })();
  var Nothing = (function () {
      function Nothing() {

      };
      Nothing.value = new Nothing();
      return Nothing;
  })();
  var maybe = function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Nothing) {
                  return v;
              };
              if (v2 instanceof Just) {
                  return v1(v2.value0);
              };
              throw new Error("Failed pattern match at Data.Maybe line 232, column 1 - line 232, column 22: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  };
  var isNothing = maybe(true)(Data_Function["const"](false));
  var isJust = maybe(false)(Data_Function["const"](true));
  var functorMaybe = new Data_Functor.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Just) {
              return new Just(v(v1.value0));
          };
          return Nothing.value;
      };
  });
  exports["Just"] = Just;
  exports["Nothing"] = Nothing;
  exports["isJust"] = isJust;
  exports["isNothing"] = isNothing;
  exports["maybe"] = maybe;
  exports["functorMaybe"] = functorMaybe;
})(PS["Data.Maybe"] = PS["Data.Maybe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Foldable"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Plus = PS["Control.Plus"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Maybe_Last = PS["Data.Maybe.Last"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Monoid_Additive = PS["Data.Monoid.Additive"];
  var Data_Monoid_Conj = PS["Data.Monoid.Conj"];
  var Data_Monoid_Disj = PS["Data.Monoid.Disj"];
  var Data_Monoid_Dual = PS["Data.Monoid.Dual"];
  var Data_Monoid_Endo = PS["Data.Monoid.Endo"];
  var Data_Monoid_Multiplicative = PS["Data.Monoid.Multiplicative"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Category = PS["Control.Category"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];        
  var Foldable = function (foldMap, foldl, foldr) {
      this.foldMap = foldMap;
      this.foldl = foldl;
      this.foldr = foldr;
  };
  var foldr = function (dict) {
      return dict.foldr;
  };
  var traverse_ = function (dictApplicative) {
      return function (dictFoldable) {
          return function (f) {
              return foldr(dictFoldable)(function ($164) {
                  return Control_Apply.applySecond(dictApplicative["__superclass_Control.Apply.Apply_0"]())(f($164));
              })(Control_Applicative.pure(dictApplicative)(Data_Unit.unit));
          };
      };
  };
  var for_ = function (dictApplicative) {
      return function (dictFoldable) {
          return Data_Function.flip(traverse_(dictApplicative)(dictFoldable));
      };
  };
  var foldl = function (dict) {
      return dict.foldl;
  }; 
  var foldMapDefaultR = function (dictFoldable) {
      return function (dictMonoid) {
          return function (f) {
              return function (xs) {
                  return foldr(dictFoldable)(function (x) {
                      return function (acc) {
                          return Data_Semigroup.append(dictMonoid["__superclass_Data.Semigroup.Semigroup_0"]())(f(x))(acc);
                      };
                  })(Data_Monoid.mempty(dictMonoid))(xs);
              };
          };
      };
  };
  var foldableArray = new Foldable(function (dictMonoid) {
      return foldMapDefaultR(foldableArray)(dictMonoid);
  }, $foreign.foldlArray, $foreign.foldrArray);
  var foldMap = function (dict) {
      return dict.foldMap;
  };
  exports["Foldable"] = Foldable;
  exports["foldMap"] = foldMap;
  exports["foldMapDefaultR"] = foldMapDefaultR;
  exports["foldl"] = foldl;
  exports["foldr"] = foldr;
  exports["for_"] = for_;
  exports["traverse_"] = traverse_;
  exports["foldableArray"] = foldableArray;
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Alt = PS["Control.Alt"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Show = PS["Data.Show"];
  var Data_Traversable = PS["Data.Traversable"];        
  var Left = (function () {
      function Left(value0) {
          this.value0 = value0;
      };
      Left.create = function (value0) {
          return new Left(value0);
      };
      return Left;
  })();
  var Right = (function () {
      function Right(value0) {
          this.value0 = value0;
      };
      Right.create = function (value0) {
          return new Right(value0);
      };
      return Right;
  })();
  var functorEither = new Data_Functor.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Left) {
              return new Left(v1.value0);
          };
          if (v1 instanceof Right) {
              return new Right(v(v1.value0));
          };
          throw new Error("Failed pattern match at Data.Either line 46, column 3 - line 46, column 26: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var either = function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Left) {
                  return v(v2.value0);
              };
              if (v2 instanceof Right) {
                  return v1(v2.value0);
              };
              throw new Error("Failed pattern match at Data.Either line 243, column 1 - line 243, column 26: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  };
  var isLeft = either(Data_Function["const"](true))(Data_Function["const"](false));
  var bifunctorEither = new Data_Bifunctor.Bifunctor(function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Left) {
                  return new Left(v(v2.value0));
              };
              if (v2 instanceof Right) {
                  return new Right(v1(v2.value0));
              };
              throw new Error("Failed pattern match at Data.Either line 53, column 3 - line 53, column 34: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  });
  var applyEither = new Control_Apply.Apply(function () {
      return functorEither;
  }, function (v) {
      return function (v1) {
          if (v instanceof Left) {
              return new Left(v.value0);
          };
          if (v instanceof Right) {
              return Data_Functor.map(functorEither)(v.value0)(v1);
          };
          throw new Error("Failed pattern match at Data.Either line 89, column 3 - line 89, column 28: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var bindEither = new Control_Bind.Bind(function () {
      return applyEither;
  }, either(function (e) {
      return function (v) {
          return new Left(e);
      };
  })(function (a) {
      return function (f) {
          return f(a);
      };
  }));
  var applicativeEither = new Control_Applicative.Applicative(function () {
      return applyEither;
  }, Right.create);
  exports["Left"] = Left;
  exports["Right"] = Right;
  exports["either"] = either;
  exports["isLeft"] = isLeft;
  exports["functorEither"] = functorEither;
  exports["bifunctorEither"] = bifunctorEither;
  exports["applyEither"] = applyEither;
  exports["applicativeEither"] = applicativeEither;
  exports["bindEither"] = bindEither;
})(PS["Data.Either"] = PS["Data.Either"] || {});
(function(exports) {
    "use strict";

  // module Control.Monad.Eff

  exports.pureE = function (a) {
    return function () {
      return a;
    };
  };

  exports.bindE = function (a) {
    return function (f) {
      return function () {
        return f(a())();
      };
    };
  };

  exports.runPure = function (f) {
    return f();
  };
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Unit = PS["Data.Unit"];        
  var monadEff = new Control_Monad.Monad(function () {
      return applicativeEff;
  }, function () {
      return bindEff;
  });
  var bindEff = new Control_Bind.Bind(function () {
      return applyEff;
  }, $foreign.bindE);
  var applyEff = new Control_Apply.Apply(function () {
      return functorEff;
  }, Control_Monad.ap(monadEff));
  var applicativeEff = new Control_Applicative.Applicative(function () {
      return applyEff;
  }, $foreign.pureE);
  var functorEff = new Data_Functor.Functor(Control_Applicative.liftA1(applicativeEff));
  exports["functorEff"] = functorEff;
  exports["applyEff"] = applyEff;
  exports["applicativeEff"] = applicativeEff;
  exports["bindEff"] = bindEff;
  exports["monadEff"] = monadEff;
  exports["runPure"] = $foreign.runPure;
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
    "use strict";

  // module Control.Monad.Eff.Unsafe

  exports.unsafeInterleaveEff = function (f) {
    return f;
  };
})(PS["Control.Monad.Eff.Unsafe"] = PS["Control.Monad.Eff.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Unsafe"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var unsafePerformEff = function ($0) {
      return Control_Monad_Eff.runPure($foreign.unsafeInterleaveEff($0));
  };
  exports["unsafePerformEff"] = unsafePerformEff;
})(PS["Control.Monad.Eff.Unsafe"] = PS["Control.Monad.Eff.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Monad = PS["Control.Monad"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_CommutativeRing = PS["Data.CommutativeRing"];
  var Data_Eq = PS["Data.Eq"];
  var Data_EuclideanRing = PS["Data.EuclideanRing"];
  var Data_Field = PS["Data.Field"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Show = PS["Data.Show"];
  var Data_Traversable = PS["Data.Traversable"];        
  var Identity = function (x) {
      return x;
  };
  var runIdentity = function (v) {
      return v;
  };
  var functorIdentity = new Data_Functor.Functor(function (f) {
      return function (v) {
          return f(v);
      };
  });
  var applyIdentity = new Control_Apply.Apply(function () {
      return functorIdentity;
  }, function (v) {
      return function (v1) {
          return v(v1);
      };
  });
  var bindIdentity = new Control_Bind.Bind(function () {
      return applyIdentity;
  }, function (v) {
      return function (f) {
          return f(v);
      };
  });
  var applicativeIdentity = new Control_Applicative.Applicative(function () {
      return applyIdentity;
  }, Identity);
  var monadIdentity = new Control_Monad.Monad(function () {
      return applicativeIdentity;
  }, function () {
      return bindIdentity;
  });
  exports["Identity"] = Identity;
  exports["runIdentity"] = runIdentity;
  exports["functorIdentity"] = functorIdentity;
  exports["applyIdentity"] = applyIdentity;
  exports["applicativeIdentity"] = applicativeIdentity;
  exports["bindIdentity"] = bindIdentity;
  exports["monadIdentity"] = monadIdentity;
})(PS["Data.Identity"] = PS["Data.Identity"] || {});
(function(exports) {
    "use strict";

  // module Partial.Unsafe

  exports.unsafePartial = function (f) {
    return f();
  };
})(PS["Partial.Unsafe"] = PS["Partial.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Partial.Unsafe"];
  var Partial = PS["Partial"];
  exports["unsafePartial"] = $foreign.unsafePartial;
})(PS["Partial.Unsafe"] = PS["Partial.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Unsafe = PS["Control.Monad.Eff.Unsafe"];
  var Control_Monad_ST = PS["Control.Monad.ST"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Unit = PS["Data.Unit"];        
  var MonadRec = function (__superclass_Control$dotMonad$dotMonad_0, tailRecM) {
      this["__superclass_Control.Monad.Monad_0"] = __superclass_Control$dotMonad$dotMonad_0;
      this.tailRecM = tailRecM;
  };
  var tailRecM = function (dict) {
      return dict.tailRecM;
  };             
  var forever = function (dictMonadRec) {
      return function (ma) {
          return tailRecM(dictMonadRec)(function (u) {
              return Data_Functor.voidRight((((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(new Data_Either.Left(u))(ma);
          })(Data_Unit.unit);
      };
  };
  exports["MonadRec"] = MonadRec;
  exports["forever"] = forever;
  exports["tailRecM"] = tailRecM;
})(PS["Control.Monad.Rec.Class"] = PS["Control.Monad.Rec.Class"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];        
  var MonadTrans = function (lift) {
      this.lift = lift;
  };
  var lift = function (dict) {
      return dict.lift;
  };
  exports["MonadTrans"] = MonadTrans;
  exports["lift"] = lift;
})(PS["Control.Monad.Trans"] = PS["Control.Monad.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Exists = PS["Data.Exists"];
  var Data_Either = PS["Data.Either"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Category = PS["Control.Category"];        
  var Bound = (function () {
      function Bound(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Bound.create = function (value0) {
          return function (value1) {
              return new Bound(value0, value1);
          };
      };
      return Bound;
  })();
  var FreeT = (function () {
      function FreeT(value0) {
          this.value0 = value0;
      };
      FreeT.create = function (value0) {
          return new FreeT(value0);
      };
      return FreeT;
  })();
  var Bind = (function () {
      function Bind(value0) {
          this.value0 = value0;
      };
      Bind.create = function (value0) {
          return new Bind(value0);
      };
      return Bind;
  })();
  var monadTransFreeT = function (dictFunctor) {
      return new Control_Monad_Trans.MonadTrans(function (dictMonad) {
          return function (ma) {
              return new FreeT(function (v) {
                  return Data_Functor.map(((dictMonad["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(Data_Either.Left.create)(ma);
              });
          };
      });
  };
  var freeT = FreeT.create;
  var bound = function (m) {
      return function (f) {
          return new Bind(Data_Exists.mkExists(new Bound(m, f)));
      };
  };
  var functorFreeT = function (dictFunctor) {
      return function (dictFunctor1) {
          return new Data_Functor.Functor(function (f) {
              return function (v) {
                  if (v instanceof FreeT) {
                      return new FreeT(function (v1) {
                          return Data_Functor.map(dictFunctor1)(Data_Bifunctor.bimap(Data_Either.bifunctorEither)(f)(Data_Functor.map(dictFunctor)(Data_Functor.map(functorFreeT(dictFunctor)(dictFunctor1))(f))))(v.value0(Data_Unit.unit));
                      });
                  };
                  if (v instanceof Bind) {
                      return Data_Exists.runExists(function (v1) {
                          return bound(v1.value0)(function ($98) {
                              return Data_Functor.map(functorFreeT(dictFunctor)(dictFunctor1))(f)(v1.value1($98));
                          });
                      })(v.value0);
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free.Trans line 55, column 3 - line 55, column 69: " + [ f.constructor.name, v.constructor.name ]);
              };
          });
      };
  };
  var bimapFreeT = function (dictFunctor) {
      return function (dictFunctor1) {
          return function (nf) {
              return function (nm) {
                  return function (v) {
                      if (v instanceof Bind) {
                          return Data_Exists.runExists(function (v1) {
                              return bound(function ($99) {
                                  return bimapFreeT(dictFunctor)(dictFunctor1)(nf)(nm)(v1.value0($99));
                              })(function ($100) {
                                  return bimapFreeT(dictFunctor)(dictFunctor1)(nf)(nm)(v1.value1($100));
                              });
                          })(v.value0);
                      };
                      if (v instanceof FreeT) {
                          return new FreeT(function (v1) {
                              return Data_Functor.map(dictFunctor1)(Data_Functor.map(Data_Either.functorEither)(function ($101) {
                                  return nf(Data_Functor.map(dictFunctor)(bimapFreeT(dictFunctor)(dictFunctor1)(nf)(nm))($101));
                              }))(nm(v.value0(Data_Unit.unit)));
                          });
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 96, column 1 - line 96, column 114: " + [ nf.constructor.name, nm.constructor.name, v.constructor.name ]);
                  };
              };
          };
      };
  };
  var hoistFreeT = function (dictFunctor) {
      return function (dictFunctor1) {
          return bimapFreeT(dictFunctor)(dictFunctor1)(Control_Category.id(Control_Category.categoryFn));
      };
  };
  var monadFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Control_Monad.Monad(function () {
              return applicativeFreeT(dictFunctor)(dictMonad);
          }, function () {
              return bindFreeT(dictFunctor)(dictMonad);
          });
      };
  };
  var bindFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Control_Bind.Bind(function () {
              return applyFreeT(dictFunctor)(dictMonad);
          }, function (v) {
              return function (f) {
                  if (v instanceof Bind) {
                      return Data_Exists.runExists(function (v1) {
                          return bound(v1.value0)(function (x) {
                              return bound(function (v2) {
                                  return v1.value1(x);
                              })(f);
                          });
                      })(v.value0);
                  };
                  return bound(function (v1) {
                      return v;
                  })(f);
              };
          });
      };
  };
  var applyFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Control_Apply.Apply(function () {
              return functorFreeT(dictFunctor)(((dictMonad["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]());
          }, Control_Monad.ap(monadFreeT(dictFunctor)(dictMonad)));
      };
  };
  var applicativeFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Control_Applicative.Applicative(function () {
              return applyFreeT(dictFunctor)(dictMonad);
          }, function (a) {
              return new FreeT(function (v) {
                  return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Left(a));
              });
          });
      };
  };
  var liftFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return function (fa) {
              return new FreeT(function (v) {
                  return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Right(Data_Functor.map(dictFunctor)(Control_Applicative.pure(applicativeFreeT(dictFunctor)(dictMonad)))(fa)));
              });
          };
      };
  };
  var resume = function (dictFunctor) {
      return function (dictMonadRec) {
          var go = function (v) {
              if (v instanceof FreeT) {
                  return Data_Functor.map((((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(Data_Either.Right.create)(v.value0(Data_Unit.unit));
              };
              if (v instanceof Bind) {
                  return Data_Exists.runExists(function (v1) {
                      var $77 = v1.value0(Data_Unit.unit);
                      if ($77 instanceof FreeT) {
                          return Control_Bind.bind((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())($77.value0(Data_Unit.unit))(function (v2) {
                              if (v2 instanceof Data_Either.Left) {
                                  return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Left(v1.value1(v2.value0)));
                              };
                              if (v2 instanceof Data_Either.Right) {
                                  return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Right(new Data_Either.Right(Data_Functor.map(dictFunctor)(function (h) {
                                      return Control_Bind.bind(bindFreeT(dictFunctor)(dictMonadRec["__superclass_Control.Monad.Monad_0"]()))(h)(v1.value1);
                                  })(v2.value0))));
                              };
                              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 49, column 9 - line 51, column 68: " + [ v2.constructor.name ]);
                          });
                      };
                      if ($77 instanceof Bind) {
                          return Data_Exists.runExists(function (v2) {
                              return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Left(Control_Bind.bind(bindFreeT(dictFunctor)(dictMonadRec["__superclass_Control.Monad.Monad_0"]()))(v2.value0(Data_Unit.unit))(function (z) {
                                  return Control_Bind.bind(bindFreeT(dictFunctor)(dictMonadRec["__superclass_Control.Monad.Monad_0"]()))(v2.value1(z))(v1.value1);
                              })));
                          })($77.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 46, column 5 - line 52, column 98: " + [ $77.constructor.name ]);
                  })(v.value0);
              };
              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 44, column 3 - line 44, column 36: " + [ v.constructor.name ]);
          };
          return Control_Monad_Rec_Class.tailRecM(dictMonadRec)(go);
      };
  };
  var runFreeT = function (dictFunctor) {
      return function (dictMonadRec) {
          return function (interp) {
              var go = function (v) {
                  if (v instanceof Data_Either.Left) {
                      return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Right(v.value0));
                  };
                  if (v instanceof Data_Either.Right) {
                      return Control_Bind.bind((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())(interp(v.value0))(function (v1) {
                          return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Left(v1));
                      });
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free.Trans line 104, column 3 - line 104, column 31: " + [ v.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(dictMonadRec)(Control_Bind.composeKleisliFlipped((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())(go)(resume(dictFunctor)(dictMonadRec)));
          };
      };
  };
  var monadRecFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Control_Monad_Rec_Class.MonadRec(function () {
              return monadFreeT(dictFunctor)(dictMonad);
          }, function (f) {
              var go = function (s) {
                  return Control_Bind.bind(bindFreeT(dictFunctor)(dictMonad))(f(s))(function (v) {
                      if (v instanceof Data_Either.Left) {
                          return go(v.value0);
                      };
                      if (v instanceof Data_Either.Right) {
                          return Control_Applicative.pure(applicativeFreeT(dictFunctor)(dictMonad))(v.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 78, column 7 - line 80, column 26: " + [ v.constructor.name ]);
                  });
              };
              return go;
          });
      };
  };
  exports["bimapFreeT"] = bimapFreeT;
  exports["freeT"] = freeT;
  exports["hoistFreeT"] = hoistFreeT;
  exports["liftFreeT"] = liftFreeT;
  exports["resume"] = resume;
  exports["runFreeT"] = runFreeT;
  exports["functorFreeT"] = functorFreeT;
  exports["applyFreeT"] = applyFreeT;
  exports["applicativeFreeT"] = applicativeFreeT;
  exports["bindFreeT"] = bindFreeT;
  exports["monadFreeT"] = monadFreeT;
  exports["monadTransFreeT"] = monadTransFreeT;
  exports["monadRecFreeT"] = monadRecFreeT;
})(PS["Control.Monad.Free.Trans"] = PS["Control.Monad.Free.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Category = PS["Control.Category"];        
  var Profunctor = function (dimap) {
      this.dimap = dimap;
  };
  var profunctorFn = new Profunctor(function (a2b) {
      return function (c2d) {
          return function (b2c) {
              return function ($4) {
                  return c2d(b2c(a2b($4)));
              };
          };
      };
  });
  var dimap = function (dict) {
      return dict.dimap;
  };
  var rmap = function (dictProfunctor) {
      return function (b2c) {
          return dimap(dictProfunctor)(Control_Category.id(Control_Category.categoryFn))(b2c);
      };
  };
  exports["Profunctor"] = Profunctor;
  exports["dimap"] = dimap;
  exports["rmap"] = rmap;
  exports["profunctorFn"] = profunctorFn;
})(PS["Data.Profunctor"] = PS["Data.Profunctor"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Biapplicative = PS["Control.Biapplicative"];
  var Control_Biapply = PS["Control.Biapply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_CommutativeRing = PS["Data.CommutativeRing"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Show = PS["Data.Show"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Unit = PS["Data.Unit"];        
  var Tuple = (function () {
      function Tuple(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Tuple.create = function (value0) {
          return function (value1) {
              return new Tuple(value0, value1);
          };
      };
      return Tuple;
  })();
  var snd = function (v) {
      return v.value1;
  };                                                                                                    
  var fst = function (v) {
      return v.value0;
  };
  exports["Tuple"] = Tuple;
  exports["fst"] = fst;
  exports["snd"] = snd;
})(PS["Data.Tuple"] = PS["Data.Tuple"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Category = PS["Control.Category"];
  var profunctorAwait = new Data_Profunctor.Profunctor(function (f) {
      return function (g) {
          return function (v) {
              return Data_Profunctor.dimap(Data_Profunctor.profunctorFn)(f)(g)(v);
          };
      };
  });
  var fuseWith = function (dictFunctor) {
      return function (dictFunctor1) {
          return function (dictFunctor2) {
              return function (dictMonadRec) {
                  return function (zap) {
                      return function (fs) {
                          return function (gs) {
                              var go = function (v) {
                                  return Control_Bind.bind((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())(Control_Monad_Free_Trans.resume(dictFunctor1)(dictMonadRec)(v.value1))(function (v1) {
                                      return Control_Bind.bind((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())(Control_Monad_Free_Trans.resume(dictFunctor)(dictMonadRec)(v.value0))(function (v2) {
                                          var $65 = Control_Apply.apply(Data_Either.applyEither)(Data_Functor.map(Data_Either.functorEither)(zap(Data_Tuple.Tuple.create))(v2))(v1);
                                          if ($65 instanceof Data_Either.Left) {
                                              return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Left($65.value0));
                                          };
                                          if ($65 instanceof Data_Either.Right) {
                                              return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())(new Data_Either.Right(Data_Functor.map(dictFunctor2)(function (t) {
                                                  return Control_Monad_Free_Trans.freeT(function (v3) {
                                                      return go(t);
                                                  });
                                              })($65.value0)));
                                          };
                                          throw new Error("Failed pattern match at Control.Coroutine line 68, column 5 - line 70, column 63: " + [ $65.constructor.name ]);
                                      });
                                  });
                              };
                              return Control_Monad_Free_Trans.freeT(function (v) {
                                  return go(new Data_Tuple.Tuple(fs, gs));
                              });
                          };
                      };
                  };
              };
          };
      };
  };
  var functorAwait = new Data_Functor.Functor(Data_Profunctor.rmap(profunctorAwait));
  var $$await = function (dictMonad) {
      return Control_Monad_Free_Trans.liftFreeT(functorAwait)(dictMonad)(Control_Category.id(Control_Category.categoryFn));
  };
  exports["await"] = $$await;
  exports["fuseWith"] = fuseWith;
  exports["profunctorAwait"] = profunctorAwait;
  exports["functorAwait"] = functorAwait;
})(PS["Control.Coroutine"] = PS["Control.Coroutine"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Category = PS["Control.Category"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];        
  var MonadEff = function (__superclass_Control$dotMonad$dotMonad_0, liftEff) {
      this["__superclass_Control.Monad.Monad_0"] = __superclass_Control$dotMonad$dotMonad_0;
      this.liftEff = liftEff;
  };
  var monadEffEff = new MonadEff(function () {
      return Control_Monad_Eff.monadEff;
  }, Control_Category.id(Control_Category.categoryFn));
  var liftEff = function (dict) {
      return dict.liftEff;
  };
  exports["MonadEff"] = MonadEff;
  exports["liftEff"] = liftEff;
  exports["monadEffEff"] = monadEffEff;
})(PS["Control.Monad.Eff.Class"] = PS["Control.Monad.Eff.Class"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Either = PS["Data.Either"];
  var Data_Function = PS["Data.Function"];
  var Data_Unit = PS["Data.Unit"];        
  var MonadError = function (__superclass_Control$dotMonad$dotMonad_0, catchError, throwError) {
      this["__superclass_Control.Monad.Monad_0"] = __superclass_Control$dotMonad$dotMonad_0;
      this.catchError = catchError;
      this.throwError = throwError;
  };
  var throwError = function (dict) {
      return dict.throwError;
  };                          
  var catchError = function (dict) {
      return dict.catchError;
  };
  exports["MonadError"] = MonadError;
  exports["catchError"] = catchError;
  exports["throwError"] = throwError;
})(PS["Control.Monad.Error.Class"] = PS["Control.Monad.Error.Class"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unit = PS["Data.Unit"];        
  var MonadState = function (__superclass_Control$dotMonad$dotMonad_0, state) {
      this["__superclass_Control.Monad.Monad_0"] = __superclass_Control$dotMonad$dotMonad_0;
      this.state = state;
  };
  var state = function (dict) {
      return dict.state;
  };
  var modify = function (dictMonadState) {
      return function (f) {
          return state(dictMonadState)(function (s) {
              return new Data_Tuple.Tuple(Data_Unit.unit, f(s));
          });
      };
  };
  var get = function (dictMonadState) {
      return state(dictMonadState)(function (s) {
          return new Data_Tuple.Tuple(s, s);
      });
  };
  exports["MonadState"] = MonadState;
  exports["get"] = get;
  exports["modify"] = modify;
  exports["state"] = state;
})(PS["Control.Monad.State.Class"] = PS["Control.Monad.State.Class"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];        
  var MonadWriter = function (__superclass_Control$dotMonad$dotMonad_0, listen, pass, writer) {
      this["__superclass_Control.Monad.Monad_0"] = __superclass_Control$dotMonad$dotMonad_0;
      this.listen = listen;
      this.pass = pass;
      this.writer = writer;
  };
  var writer = function (dict) {
      return dict.writer;
  };
  var tell = function (dictMonadWriter) {
      return function ($9) {
          return writer(dictMonadWriter)(Data_Tuple.Tuple.create(Data_Unit.unit)($9));
      };
  };
  var pass = function (dict) {
      return dict.pass;
  };
  var listen = function (dict) {
      return dict.listen;
  };
  exports["MonadWriter"] = MonadWriter;
  exports["listen"] = listen;
  exports["pass"] = pass;
  exports["tell"] = tell;
  exports["writer"] = writer;
})(PS["Control.Monad.Writer.Class"] = PS["Control.Monad.Writer.Class"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_RWS_Class = PS["Control.Monad.RWS.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Function = PS["Data.Function"];
  var Control_Category = PS["Control.Category"];        
  var MaybeT = function (x) {
      return x;
  };
  var runMaybeT = function (v) {
      return v;
  };
  var monadMaybeT = function (dictMonad) {
      return new Control_Monad.Monad(function () {
          return applicativeMaybeT(dictMonad);
      }, function () {
          return bindMaybeT(dictMonad);
      });
  };
  var functorMaybeT = function (dictMonad) {
      return new Data_Functor.Functor(Control_Applicative.liftA1(applicativeMaybeT(dictMonad)));
  };
  var bindMaybeT = function (dictMonad) {
      return new Control_Bind.Bind(function () {
          return applyMaybeT(dictMonad);
      }, function (v) {
          return function (f) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(v)(function (v1) {
                  if (v1 instanceof Data_Maybe.Nothing) {
                      return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(Data_Maybe.Nothing.value);
                  };
                  if (v1 instanceof Data_Maybe.Just) {
                      var $36 = f(v1.value0);
                      return $36;
                  };
                  throw new Error("Failed pattern match at Control.Monad.Maybe.Trans line 55, column 5 - line 58, column 22: " + [ v1.constructor.name ]);
              });
          };
      });
  };
  var applyMaybeT = function (dictMonad) {
      return new Control_Apply.Apply(function () {
          return functorMaybeT(dictMonad);
      }, Control_Monad.ap(monadMaybeT(dictMonad)));
  };
  var applicativeMaybeT = function (dictMonad) {
      return new Control_Applicative.Applicative(function () {
          return applyMaybeT(dictMonad);
      }, function ($61) {
          return MaybeT(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(Data_Maybe.Just.create($61)));
      });
  };
  var monadRecMaybeT = function (dictMonadRec) {
      return new Control_Monad_Rec_Class.MonadRec(function () {
          return monadMaybeT(dictMonadRec["__superclass_Control.Monad.Monad_0"]());
      }, function (f) {
          return function ($63) {
              return MaybeT(Control_Monad_Rec_Class.tailRecM(dictMonadRec)(function (a) {
                  var $42 = f(a);
                  return Control_Bind.bind((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())($42)(function (m$prime) {
                      return Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())((function () {
                          if (m$prime instanceof Data_Maybe.Nothing) {
                              return new Data_Either.Right(Data_Maybe.Nothing.value);
                          };
                          if (m$prime instanceof Data_Maybe.Just && m$prime.value0 instanceof Data_Either.Left) {
                              return new Data_Either.Left(m$prime.value0.value0);
                          };
                          if (m$prime instanceof Data_Maybe.Just && m$prime.value0 instanceof Data_Either.Right) {
                              return new Data_Either.Right(new Data_Maybe.Just(m$prime.value0.value0));
                          };
                          throw new Error("Failed pattern match at Control.Monad.Maybe.Trans line 86, column 11 - line 89, column 45: " + [ m$prime.constructor.name ]);
                      })());
                  });
              })($63));
          };
      });
  };
  var altMaybeT = function (dictMonad) {
      return new Control_Alt.Alt(function () {
          return functorMaybeT(dictMonad);
      }, function (v) {
          return function (v1) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(v)(function (v2) {
                  if (v2 instanceof Data_Maybe.Nothing) {
                      return v1;
                  };
                  return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(v2);
              });
          };
      });
  };
  var plusMaybeT = function (dictMonad) {
      return new Control_Plus.Plus(function () {
          return altMaybeT(dictMonad);
      }, Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(Data_Maybe.Nothing.value));
  };
  exports["MaybeT"] = MaybeT;
  exports["runMaybeT"] = runMaybeT;
  exports["functorMaybeT"] = functorMaybeT;
  exports["applyMaybeT"] = applyMaybeT;
  exports["applicativeMaybeT"] = applicativeMaybeT;
  exports["bindMaybeT"] = bindMaybeT;
  exports["monadMaybeT"] = monadMaybeT;
  exports["altMaybeT"] = altMaybeT;
  exports["plusMaybeT"] = plusMaybeT;
  exports["monadRecMaybeT"] = monadRecMaybeT;
})(PS["Control.Monad.Maybe.Trans"] = PS["Control.Monad.Maybe.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Coroutine = PS["Control.Coroutine"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_Maybe_Trans = PS["Control.Monad.Maybe.Trans"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Maybe = PS["Data.Maybe"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Function = PS["Data.Function"];
  var Data_Unit = PS["Data.Unit"];        
  var Emit = (function () {
      function Emit(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Emit.create = function (value0) {
          return function (value1) {
              return new Emit(value0, value1);
          };
      };
      return Emit;
  })();
  var Stall = (function () {
      function Stall(value0) {
          this.value0 = value0;
      };
      Stall.create = function (value0) {
          return new Stall(value0);
      };
      return Stall;
  })();
  var runStallingProcess = function (dictMonadRec) {
      return function ($30) {
          return Control_Monad_Maybe_Trans.runMaybeT(Control_Monad_Free_Trans.runFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.monadRecMaybeT(dictMonadRec))(Data_Maybe.maybe(Control_Plus.empty(Control_Monad_Maybe_Trans.plusMaybeT(dictMonadRec["__superclass_Control.Monad.Monad_0"]())))(Control_Applicative.pure(Control_Monad_Maybe_Trans.applicativeMaybeT(dictMonadRec["__superclass_Control.Monad.Monad_0"]()))))(Control_Monad_Free_Trans.hoistFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.functorMaybeT(dictMonadRec["__superclass_Control.Monad.Monad_0"]()))(function ($31) {
              return Control_Monad_Maybe_Trans.MaybeT(Data_Functor.map((((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(Data_Maybe.Just.create)($31));
          })($30)));
      };
  };
  var bifunctorStallF = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (v) {
              if (v instanceof Emit) {
                  return new Emit(f(v.value0), g(v.value1));
              };
              if (v instanceof Stall) {
                  return new Stall(g(v.value0));
              };
              throw new Error("Failed pattern match at Control.Coroutine.Stalling line 51, column 15 - line 53, column 27: " + [ v.constructor.name ]);
          };
      };
  });
  var functorStallF = new Data_Functor.Functor(function (f) {
      return Data_Bifunctor.rmap(bifunctorStallF)(f);
  });
  var fuse = function (dictMonadRec) {
      return Control_Coroutine.fuseWith(functorStallF)(Control_Coroutine.functorAwait)(Data_Maybe.functorMaybe)(dictMonadRec)(function (f) {
          return function (q) {
              return function (v) {
                  if (q instanceof Emit) {
                      return new Data_Maybe.Just(f(q.value1)(v(q.value0)));
                  };
                  if (q instanceof Stall) {
                      return Data_Maybe.Nothing.value;
                  };
                  throw new Error("Failed pattern match at Control.Coroutine.Stalling line 86, column 5 - line 88, column 27: " + [ q.constructor.name ]);
              };
          };
      });
  };
  exports["Emit"] = Emit;
  exports["Stall"] = Stall;
  exports["fuse"] = fuse;
  exports["runStallingProcess"] = runStallingProcess;
  exports["bifunctorStallF"] = bifunctorStallF;
  exports["functorStallF"] = functorStallF;
})(PS["Control.Coroutine.Stalling"] = PS["Control.Coroutine.Stalling"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports._forkAff = function (nonCanceler, aff) {
    var voidF = function(){};

    return function(success, error) {
      var canceler = aff(voidF, voidF);
      success(canceler);
      return nonCanceler;
    };
  }

  exports._forkAll = function (nonCanceler, foldl, affs) {
    var voidF = function(){};

    return function(success, error) {
      try {
        var cancelers = foldl(function(acc) {
          return function(aff) {
            acc.push(aff(voidF, voidF));
            return acc;
          }
        })([])(affs);
      } catch (err) {
        error(err)
      }

      var canceler = function(e) {
        return function(success, error) {
          var cancellations = 0;
          var result        = false;
          var errored       = false;

          var s = function(bool) {
            cancellations = cancellations + 1;
            result        = result || bool;

            if (cancellations === cancelers.length && !errored) {
              success(result);
            }
          };

          var f = function(err) {
            if (!errored) {
              errored = true;
              error(err);
            }
          };

          for (var i = 0; i < cancelers.length; i++) {
            cancelers[i](e)(s, f);
          }

          return nonCanceler;
        };
      };

      success(canceler);
      return nonCanceler;
    };
  }

  exports._makeAff = function (cb) {
    return function(success, error) {
      try {
        return cb(function(e) {
          return function() {
            error(e);
          };
        })(function(v) {
          return function() {
            success(v);
          };
        })();
      } catch (err) {
        error(err);
      }
    }
  }

  exports._pure = function (nonCanceler, v) {
    return function(success, error) {
      success(v);
      return nonCanceler;
    };
  }

  exports._throwError = function (nonCanceler, e) {
    return function(success, error) {
      error(e);
      return nonCanceler;
    };
  }

  exports._fmap = function (f, aff) {
    return function(success, error) {
      try {
        return aff(function(v) {
          try {
            var v2 = f(v);
          } catch (err) {
            error(err)
          }
          success(v2);
        }, error);
      } catch (err) {
        error(err);
      }
    };
  }

  exports._bind = function (alwaysCanceler, aff, f) {
    return function(success, error) {
      var canceler1, canceler2;

      var isCanceled    = false;
      var requestCancel = false;

      var onCanceler = function(){};

      canceler1 = aff(function(v) {
        if (requestCancel) {
          isCanceled = true;

          return alwaysCanceler;
        } else {
          canceler2 = f(v)(success, error);

          onCanceler(canceler2);

          return canceler2;
        }
      }, error);

      return function(e) {
        return function(s, f) {
          requestCancel = true;

          if (canceler2 !== undefined) {
            return canceler2(e)(s, f);
          } else {
            return canceler1(e)(function(bool) {
              if (bool || isCanceled) {
                s(true);
              } else {
                onCanceler = function(canceler) {
                  canceler(e)(s, f);
                };
              }
            }, f);
          }
        };
      };
    };
  }

  exports._attempt = function (Left, Right, aff) {
    return function(success, error) {
      try {
        return aff(function(v) {
          success(Right(v));
        }, function(e) {
          success(Left(e));
        });
      } catch (err) {
        success(Left(err));
      }
    };
  }

  exports._runAff = function (errorT, successT, aff) {
    return function() {
      return aff(function(v) {
        successT(v)();
      }, function(e) {
        errorT(e)();
      });
    };
  }

  exports._liftEff = function (nonCanceler, e) {
    return function(success, error) {
      var result;
      try {
        result = e();
      } catch (err) {
        error(err);
        return nonCanceler;
      }

      success(result);
      return nonCanceler;
    };
  }

  exports._tailRecM = function (isLeft, f, a) {
    return function(success, error) {
      return function go(acc) {
        var result, status, canceler;

        // Observes synchronous effects using a flag.
        //   status = 0 (unresolved status)
        //   status = 1 (synchronous effect)
        //   status = 2 (asynchronous effect)
        while (true) {
          status = 0;
          canceler = f(acc)(function(v) {
            // If the status is still unresolved, we have observed a
            // synchronous effect. Otherwise, the status will be `2`.
            if (status === 0) {
              // Store the result for further synchronous processing.
              result = v;
              status = 1;
            } else {
              // When we have observed an asynchronous effect, we use normal
              // recursion. This is safe because we will be on a new stack.
              if (isLeft(v)) {
                go(v.value0);
              } else {
                try {
                  success(v.value0);
                } catch (err) {
                  error(err);
                }
              }
            }
          }, error);

          // If the status has already resolved to `1` by our Aff handler, then
          // we have observed a synchronous effect. Otherwise it will still be
          // `0`.
          if (status === 1) {
            // When we have observed a synchronous effect, we merely swap out the
            // accumulator and continue the loop, preserving stack.
            if (isLeft(result)) {
              acc = result.value0;
              continue;
            } else {
              try {
                success(result.value0);
              } catch (err) {
                error(err);
              }
            }
          } else {
            // If the status has not resolved yet, then we have observed an
            // asynchronous effect.
            status = 2;
          }
          return canceler;
        }

      }(a);
    };
  };
})(PS["Control.Monad.Aff"] = PS["Control.Monad.Aff"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports._makeVar = function (nonCanceler) {
    return function(success, error) {
      try {
        success({
          consumers: [],
          producers: [],
          error: undefined
        });
      } catch (err) {
        error(err);
      }

      return nonCanceler;
    };
  };

  exports._takeVar = function (nonCanceler, avar) {
    return function(success, error) {
      if (avar.error !== undefined) {
        error(avar.error);
      } else if (avar.producers.length > 0) {
        var producer = avar.producers.shift();

        producer(success, error);
      } else {
        avar.consumers.push({success: success, error: error});
      }

      return nonCanceler;
    };
  };

  exports._putVar = function (nonCanceler, avar, a) {
    return function(success, error) {
      if (avar.error !== undefined) {
        error(avar.error);
      } else if (avar.consumers.length === 0) {
        avar.producers.push(function(success, error) {
          try {
            success(a);
          } catch (err) {
            error(err);
          }
        });

        success({});
      } else {
        var consumer = avar.consumers.shift();

        try {
          consumer.success(a);
        } catch (err) {
          error(err);

          return;
        }

        success({});
      }

      return nonCanceler;
    };
  };
})(PS["Control.Monad.Aff.Internal"] = PS["Control.Monad.Aff.Internal"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.error = function (msg) {
    return new Error(msg);
  };

  exports.throwException = function (e) {
    return function () {
      throw e;
    };
  };
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Show = PS["Data.Show"];
  var Prelude = PS["Prelude"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Functor = PS["Data.Functor"];
  exports["error"] = $foreign.error;
  exports["throwException"] = $foreign.throwException;
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
    "use strict";

  exports.runFn2 = function (fn) {
    return function (a) {
      return function (b) {
        return fn(a, b);
      };
    };
  };

  exports.runFn3 = function (fn) {
    return function (a) {
      return function (b) {
        return function (c) {
          return fn(a, b, c);
        };
      };
    };
  };

  exports.runFn4 = function (fn) {
    return function (a) {
      return function (b) {
        return function (c) {
          return function (d) {
            return fn(a, b, c, d);
          };
        };
      };
    };
  };
})(PS["Data.Function.Uncurried"] = PS["Data.Function.Uncurried"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Function.Uncurried"];
  var Data_Unit = PS["Data.Unit"];
  exports["runFn2"] = $foreign.runFn2;
  exports["runFn3"] = $foreign.runFn3;
  exports["runFn4"] = $foreign.runFn4;
})(PS["Data.Function.Uncurried"] = PS["Data.Function.Uncurried"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Monad.Aff.Internal"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  exports["_makeVar"] = $foreign._makeVar;
  exports["_putVar"] = $foreign._putVar;
  exports["_takeVar"] = $foreign._takeVar;
})(PS["Control.Monad.Aff.Internal"] = PS["Control.Monad.Aff.Internal"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Control.Monad.Aff"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Aff_Internal = PS["Control.Monad.Aff.Internal"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Parallel_Class = PS["Control.Parallel.Class"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Either = PS["Data.Either"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_Monoid = PS["Data.Monoid"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Function = PS["Data.Function"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Semiring = PS["Data.Semiring"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var runAff = function (ex) {
      return function (f) {
          return function (aff) {
              return Data_Function_Uncurried.runFn3($foreign._runAff)(ex)(f)(aff);
          };
      };
  };
  var makeAff$prime = function (h) {
      return $foreign._makeAff(h);
  };
  var functorAff = new Data_Functor.Functor(function (f) {
      return function (fa) {
          return Data_Function_Uncurried.runFn2($foreign._fmap)(f)(fa);
      };
  });  
  var attempt = function (aff) {
      return Data_Function_Uncurried.runFn3($foreign._attempt)(Data_Either.Left.create)(Data_Either.Right.create)(aff);
  };
  var applyAff = new Control_Apply.Apply(function () {
      return functorAff;
  }, function (ff) {
      return function (fa) {
          return Data_Function_Uncurried.runFn3($foreign._bind)(alwaysCanceler)(ff)(function (f) {
              return Data_Functor.map(functorAff)(f)(fa);
          });
      };
  });
  var applicativeAff = new Control_Applicative.Applicative(function () {
      return applyAff;
  }, function (v) {
      return Data_Function_Uncurried.runFn2($foreign._pure)(nonCanceler)(v);
  });
  var nonCanceler = Data_Function["const"](Control_Applicative.pure(applicativeAff)(false));
  var alwaysCanceler = Data_Function["const"](Control_Applicative.pure(applicativeAff)(true));
  var forkAff = function (aff) {
      return Data_Function_Uncurried.runFn2($foreign._forkAff)(nonCanceler)(aff);
  };
  var forkAll = function (dictFoldable) {
      return function (affs) {
          return Data_Function_Uncurried.runFn3($foreign._forkAll)(nonCanceler)(Data_Foldable.foldl(dictFoldable))(affs);
      };
  };
  var makeAff = function (h) {
      return makeAff$prime(function (e) {
          return function (a) {
              return Data_Functor.map(Control_Monad_Eff.functorEff)(Data_Function["const"](nonCanceler))(h(e)(a));
          };
      });
  };                                                                         
  var bindAff = new Control_Bind.Bind(function () {
      return applyAff;
  }, function (fa) {
      return function (f) {
          return Data_Function_Uncurried.runFn3($foreign._bind)(alwaysCanceler)(fa)(f);
      };
  });
  var monadAff = new Control_Monad.Monad(function () {
      return applicativeAff;
  }, function () {
      return bindAff;
  });
  var monadEffAff = new Control_Monad_Eff_Class.MonadEff(function () {
      return monadAff;
  }, function (eff) {
      return Data_Function_Uncurried.runFn2($foreign._liftEff)(nonCanceler)(eff);
  });
  var monadRecAff = new Control_Monad_Rec_Class.MonadRec(function () {
      return monadAff;
  }, function (f) {
      return function (a) {
          return Data_Function_Uncurried.runFn3($foreign._tailRecM)(Data_Either.isLeft)(f)(a);
      };
  });
  var monadErrorAff = new Control_Monad_Error_Class.MonadError(function () {
      return monadAff;
  }, function (aff) {
      return function (ex) {
          return Control_Bind.bind(bindAff)(attempt(aff))(Data_Either.either(ex)(Control_Applicative.pure(applicativeAff)));
      };
  }, function (e) {
      return Data_Function_Uncurried.runFn2($foreign._throwError)(nonCanceler)(e);
  });                                                                                                                        
  var altAff = new Control_Alt.Alt(function () {
      return functorAff;
  }, function (a1) {
      return function (a2) {
          return Control_Bind.bind(bindAff)(attempt(a1))(Data_Either.either(Data_Function["const"](a2))(Control_Applicative.pure(applicativeAff)));
      };
  });
  var plusAff = new Control_Plus.Plus(function () {
      return altAff;
  }, Data_Function.apply(Control_Monad_Error_Class.throwError(monadErrorAff))(Control_Monad_Eff_Exception.error("Always fails")));
  exports["attempt"] = attempt;
  exports["forkAff"] = forkAff;
  exports["forkAll"] = forkAll;
  exports["makeAff"] = makeAff;
  exports["nonCanceler"] = nonCanceler;
  exports["runAff"] = runAff;
  exports["functorAff"] = functorAff;
  exports["applyAff"] = applyAff;
  exports["applicativeAff"] = applicativeAff;
  exports["bindAff"] = bindAff;
  exports["monadAff"] = monadAff;
  exports["monadEffAff"] = monadEffAff;
  exports["monadErrorAff"] = monadErrorAff;
  exports["altAff"] = altAff;
  exports["plusAff"] = plusAff;
  exports["monadRecAff"] = monadRecAff;
})(PS["Control.Monad.Aff"] = PS["Control.Monad.Aff"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_Internal_1 = PS["Control.Monad.Aff.Internal"];
  var Control_Monad_Aff_Internal_1 = PS["Control.Monad.Aff.Internal"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Data_Function = PS["Data.Function"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var fromAVBox = Unsafe_Coerce.unsafeCoerce;
  var makeVar = Data_Function.apply(fromAVBox)(Control_Monad_Aff_Internal_1._makeVar(Control_Monad_Aff.nonCanceler));
  var putVar = function (q) {
      return function (a) {
          return Data_Function.apply(fromAVBox)(Data_Function_Uncurried.runFn3(Control_Monad_Aff_Internal_1._putVar)(Control_Monad_Aff.nonCanceler)(q)(a));
      };
  };
  var makeVar$prime = function (a) {
      return Control_Bind.bind(Control_Monad_Aff.bindAff)(makeVar)(function (v) {
          return Control_Bind.bind(Control_Monad_Aff.bindAff)(putVar(v)(a))(function () {
              return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(v);
          });
      });
  };
  var takeVar = function (q) {
      return Data_Function.apply(fromAVBox)(Data_Function_Uncurried.runFn2(Control_Monad_Aff_Internal_1._takeVar)(Control_Monad_Aff.nonCanceler)(q));
  };
  var modifyVar = function (f) {
      return function (v) {
          return Control_Bind.bind(Control_Monad_Aff.bindAff)(takeVar(v))(function ($2) {
              return putVar(v)(f($2));
          });
      };
  };
  exports["makeVar"] = makeVar;
  exports["makeVar'"] = makeVar$prime;
  exports["modifyVar"] = modifyVar;
  exports["putVar"] = putVar;
  exports["takeVar"] = takeVar;
})(PS["Control.Monad.Aff.AVar"] = PS["Control.Monad.Aff.AVar"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var otherwise = true;
  exports["otherwise"] = otherwise;
})(PS["Data.Boolean"] = PS["Data.Boolean"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Generic = PS["Data.Generic"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unfoldable = PS["Data.Unfoldable"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Control_Category = PS["Control.Category"];        
  var Nil = (function () {
      function Nil() {

      };
      Nil.value = new Nil();
      return Nil;
  })();
  var Cons = (function () {
      function Cons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Cons.create = function (value0) {
          return function (value1) {
              return new Cons(value0, value1);
          };
      };
      return Cons;
  })();
  var tail = function (v) {
      if (v instanceof Nil) {
          return Data_Maybe.Nothing.value;
      };
      if (v instanceof Cons) {
          return new Data_Maybe.Just(v.value1);
      };
      throw new Error("Failed pattern match at Data.List line 232, column 1 - line 232, column 19: " + [ v.constructor.name ]);
  };
  var semigroupList = new Data_Semigroup.Semigroup(function (v) {
      return function (ys) {
          if (v instanceof Nil) {
              return ys;
          };
          if (v instanceof Cons) {
              return new Cons(v.value0, Data_Semigroup.append(semigroupList)(v.value1)(ys));
          };
          throw new Error("Failed pattern match at Data.List line 719, column 3 - line 719, column 21: " + [ v.constructor.name, ys.constructor.name ]);
      };
  });
  var reverse = (function () {
      var go = function (__copy_acc) {
          return function (__copy_v) {
              var acc = __copy_acc;
              var v = __copy_v;
              tco: while (true) {
                  if (v instanceof Nil) {
                      return acc;
                  };
                  if (v instanceof Cons) {
                      var __tco_acc = new Cons(v.value0, acc);
                      var __tco_v = v.value1;
                      acc = __tco_acc;
                      v = __tco_v;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.List line 346, column 1 - line 349, column 42: " + [ acc.constructor.name, v.constructor.name ]);
              };
          };
      };
      return go(Nil.value);
  })();
  var head = function (v) {
      if (v instanceof Nil) {
          return Data_Maybe.Nothing.value;
      };
      if (v instanceof Cons) {
          return new Data_Maybe.Just(v.value0);
      };
      throw new Error("Failed pattern match at Data.List line 217, column 1 - line 217, column 19: " + [ v.constructor.name ]);
  };
  var functorList = new Data_Functor.Functor(function (f) {
      return function (lst) {
          var go = function (v) {
              return function (acc) {
                  if (v instanceof Nil) {
                      return acc;
                  };
                  if (v instanceof Cons) {
                      return Data_Function.apply(go(v.value1))(new Cons(f(v.value0), acc));
                  };
                  throw new Error("Failed pattern match at Data.List line 726, column 3 - line 729, column 48: " + [ v.constructor.name, acc.constructor.name ]);
              };
          };
          return Data_Function.apply(reverse)(go(lst)(Nil.value));
      };
  });
  var fromFoldable = function (dictFoldable) {
      return Data_Foldable.foldr(dictFoldable)(Cons.create)(Nil.value);
  };
  var foldableList = new Data_Foldable.Foldable(function (dictMonoid) {
      return function (f) {
          return Data_Foldable.foldl(foldableList)(function (acc) {
              return function ($387) {
                  return Data_Semigroup.append(dictMonoid["__superclass_Data.Semigroup.Semigroup_0"]())(acc)(f($387));
              };
          })(Data_Monoid.mempty(dictMonoid));
      };
  }, (function () {
      var go = function (__copy_v) {
          return function (__copy_b) {
              return function (__copy_v1) {
                  var v = __copy_v;
                  var b = __copy_b;
                  var v1 = __copy_v1;
                  tco: while (true) {
                      if (v1 instanceof Nil) {
                          return b;
                      };
                      if (v1 instanceof Cons) {
                          var __tco_v = v;
                          var __tco_b = v(b)(v1.value0);
                          var __tco_v1 = v1.value1;
                          v = __tco_v;
                          b = __tco_b;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.List line 734, column 3 - line 737, column 49: " + [ v.constructor.name, b.constructor.name, v1.constructor.name ]);
                  };
              };
          };
      };
      return go;
  })(), function (v) {
      return function (b) {
          return function (v1) {
              if (v1 instanceof Nil) {
                  return b;
              };
              if (v1 instanceof Cons) {
                  return v(v1.value0)(Data_Foldable.foldr(foldableList)(v)(b)(v1.value1));
              };
              throw new Error("Failed pattern match at Data.List line 732, column 3 - line 732, column 20: " + [ v.constructor.name, b.constructor.name, v1.constructor.name ]);
          };
      };
  });
  var filter = function (p) {
      var go = function (__copy_acc) {
          return function (__copy_v) {
              var acc = __copy_acc;
              var v = __copy_v;
              tco: while (true) {
                  if (v instanceof Nil) {
                      return reverse(acc);
                  };
                  if (v instanceof Cons) {
                      if (p(v.value0)) {
                          var __tco_acc = new Cons(v.value0, acc);
                          var __tco_v = v.value1;
                          acc = __tco_acc;
                          v = __tco_v;
                          continue tco;
                      };
                      if (Data_Boolean.otherwise) {
                          var __tco_acc = acc;
                          var __tco_v = v.value1;
                          acc = __tco_acc;
                          v = __tco_v;
                          continue tco;
                      };
                  };
                  throw new Error("Failed pattern match at Data.List line 369, column 1 - line 374, column 28: " + [ acc.constructor.name, v.constructor.name ]);
              };
          };
      };
      return go(Nil.value);
  };
  exports["Nil"] = Nil;
  exports["Cons"] = Cons;
  exports["filter"] = filter;
  exports["fromFoldable"] = fromFoldable;
  exports["head"] = head;
  exports["reverse"] = reverse;
  exports["tail"] = tail;
  exports["semigroupList"] = semigroupList;
  exports["functorList"] = functorList;
  exports["foldableList"] = foldableList;
})(PS["Data.List"] = PS["Data.List"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];
  var Data_Tuple = PS["Data.Tuple"];        
  var CatQueue = (function () {
      function CatQueue(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CatQueue.create = function (value0) {
          return function (value1) {
              return new CatQueue(value0, value1);
          };
      };
      return CatQueue;
  })();
  var uncons = function (__copy_v) {
      var v = __copy_v;
      tco: while (true) {
          if (v.value0 instanceof Data_List.Nil && v.value1 instanceof Data_List.Nil) {
              return Data_Maybe.Nothing.value;
          };
          if (v.value0 instanceof Data_List.Nil) {
              var __tco_v = new CatQueue(Data_List.reverse(v.value1), Data_List.Nil.value);
              v = __tco_v;
              continue tco;
          };
          if (v.value0 instanceof Data_List.Cons) {
              return new Data_Maybe.Just(new Data_Tuple.Tuple(v.value0.value0, new CatQueue(v.value0.value1, v.value1)));
          };
          throw new Error("Failed pattern match at Data.CatQueue line 51, column 1 - line 51, column 36: " + [ v.constructor.name ]);
      };
  };
  var snoc = function (v) {
      return function (a) {
          return new CatQueue(v.value0, new Data_List.Cons(a, v.value1));
      };
  };
  var $$null = function (v) {
      if (v.value0 instanceof Data_List.Nil && v.value1 instanceof Data_List.Nil) {
          return true;
      };
      return false;
  };
  var empty = new CatQueue(Data_List.Nil.value, Data_List.Nil.value);
  exports["CatQueue"] = CatQueue;
  exports["empty"] = empty;
  exports["null"] = $$null;
  exports["snoc"] = snoc;
  exports["uncons"] = uncons;
})(PS["Data.CatQueue"] = PS["Data.CatQueue"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_CatQueue = PS["Data.CatQueue"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];
  var Data_Tuple = PS["Data.Tuple"];        
  var CatNil = (function () {
      function CatNil() {

      };
      CatNil.value = new CatNil();
      return CatNil;
  })();
  var CatCons = (function () {
      function CatCons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CatCons.create = function (value0) {
          return function (value1) {
              return new CatCons(value0, value1);
          };
      };
      return CatCons;
  })();
  var link = function (v) {
      return function (cat) {
          if (v instanceof CatNil) {
              return cat;
          };
          if (v instanceof CatCons) {
              return new CatCons(v.value0, Data_CatQueue.snoc(v.value1)(cat));
          };
          throw new Error("Failed pattern match at Data.CatList line 88, column 1 - line 88, column 22: " + [ v.constructor.name, cat.constructor.name ]);
      };
  };
  var foldr = function (k) {
      return function (b) {
          return function (q) {
              var foldl = function (__copy_v) {
                  return function (__copy_c) {
                      return function (__copy_v1) {
                          var v = __copy_v;
                          var c = __copy_c;
                          var v1 = __copy_v1;
                          tco: while (true) {
                              if (v1 instanceof Data_List.Nil) {
                                  return c;
                              };
                              if (v1 instanceof Data_List.Cons) {
                                  var __tco_v = v;
                                  var __tco_c = v(c)(v1.value0);
                                  var __tco_v1 = v1.value1;
                                  v = __tco_v;
                                  c = __tco_c;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              throw new Error("Failed pattern match at Data.CatList line 103, column 3 - line 103, column 22: " + [ v.constructor.name, c.constructor.name, v1.constructor.name ]);
                          };
                      };
                  };
              };
              var go = function (__copy_xs) {
                  return function (__copy_ys) {
                      var xs = __copy_xs;
                      var ys = __copy_ys;
                      tco: while (true) {
                          var $22 = Data_CatQueue.uncons(xs);
                          if ($22 instanceof Data_Maybe.Nothing) {
                              return foldl(function (x) {
                                  return function (i) {
                                      return i(x);
                                  };
                              })(b)(ys);
                          };
                          if ($22 instanceof Data_Maybe.Just) {
                              var __tco_ys = new Data_List.Cons(k($22.value0.value0), ys);
                              xs = $22.value0.value1;
                              ys = __tco_ys;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.CatList line 98, column 14 - line 100, column 67: " + [ $22.constructor.name ]);
                      };
                  };
              };
              return go(q)(Data_List.Nil.value);
          };
      };
  };
  var uncons = function (v) {
      if (v instanceof CatNil) {
          return Data_Maybe.Nothing.value;
      };
      if (v instanceof CatCons) {
          return new Data_Maybe.Just(new Data_Tuple.Tuple(v.value0, (function () {
              var $27 = Data_CatQueue["null"](v.value1);
              if ($27) {
                  return CatNil.value;
              };
              if (!$27) {
                  return foldr(link)(CatNil.value)(v.value1);
              };
              throw new Error("Failed pattern match at Data.CatList line 80, column 39 - line 80, column 89: " + [ $27.constructor.name ]);
          })()));
      };
      throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 79, column 24: " + [ v.constructor.name ]);
  };
  var empty = CatNil.value;
  var append = function (v) {
      return function (v1) {
          if (v1 instanceof CatNil) {
              return v;
          };
          if (v instanceof CatNil) {
              return v1;
          };
          return link(v)(v1);
      };
  };
  var semigroupCatList = new Data_Semigroup.Semigroup(append);
  var snoc = function (cat) {
      return function (a) {
          return append(cat)(new CatCons(a, Data_CatQueue.empty));
      };
  };
  exports["CatNil"] = CatNil;
  exports["CatCons"] = CatCons;
  exports["append"] = append;
  exports["empty"] = empty;
  exports["snoc"] = snoc;
  exports["uncons"] = uncons;
  exports["semigroupCatList"] = semigroupCatList;
})(PS["Data.CatList"] = PS["Data.CatList"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Data_CatList = PS["Data.CatList"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Inject = PS["Data.Inject"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Free = (function () {
      function Free(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Free.create = function (value0) {
          return function (value1) {
              return new Free(value0, value1);
          };
      };
      return Free;
  })();
  var Return = (function () {
      function Return(value0) {
          this.value0 = value0;
      };
      Return.create = function (value0) {
          return new Return(value0);
      };
      return Return;
  })();
  var Bind = (function () {
      function Bind(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Bind.create = function (value0) {
          return function (value1) {
              return new Bind(value0, value1);
          };
      };
      return Bind;
  })();
  var toView = function (__copy_v) {
      var v = __copy_v;
      tco: while (true) {
          var runExpF = function (v2) {
              return v2;
          };
          var concatF = function (v2) {
              return function (r) {
                  return new Free(v2.value0, Data_Semigroup.append(Data_CatList.semigroupCatList)(v2.value1)(r));
              };
          };
          if (v.value0 instanceof Return) {
              var $19 = Data_CatList.uncons(v.value1);
              if ($19 instanceof Data_Maybe.Nothing) {
                  return new Return(Unsafe_Coerce.unsafeCoerce(v.value0.value0));
              };
              if ($19 instanceof Data_Maybe.Just) {
                  var __tco_v = Unsafe_Coerce.unsafeCoerce(concatF(runExpF($19.value0.value0)(v.value0.value0))($19.value0.value1));
                  v = __tco_v;
                  continue tco;
              };
              throw new Error("Failed pattern match at Control.Monad.Free line 145, column 7 - line 149, column 64: " + [ $19.constructor.name ]);
          };
          if (v.value0 instanceof Bind) {
              return new Bind(v.value0.value0, function (a) {
                  return Unsafe_Coerce.unsafeCoerce(concatF(v.value0.value1(a))(v.value1));
              });
          };
          throw new Error("Failed pattern match at Control.Monad.Free line 143, column 3 - line 151, column 56: " + [ v.value0.constructor.name ]);
      };
  };
  var runFreeM = function (dictFunctor) {
      return function (dictMonadRec) {
          return function (k) {
              var go = function (f) {
                  var $28 = toView(f);
                  if ($28 instanceof Return) {
                      return Data_Functor.map((((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(Data_Either.Right.create)(Control_Applicative.pure((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Applicative.Applicative_0"]())($28.value0));
                  };
                  if ($28 instanceof Bind) {
                      return Data_Functor.map((((dictMonadRec["__superclass_Control.Monad.Monad_0"]())["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(Data_Either.Left.create)(k(Data_Functor.map(dictFunctor)($28.value1)($28.value0)));
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free line 131, column 10 - line 133, column 37: " + [ $28.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(dictMonadRec)(go);
          };
      };
  };
  var fromView = function (f) {
      return new Free(Unsafe_Coerce.unsafeCoerce(f), Data_CatList.empty);
  };
  var freeMonad = new Control_Monad.Monad(function () {
      return freeApplicative;
  }, function () {
      return freeBind;
  });
  var freeFunctor = new Data_Functor.Functor(function (k) {
      return function (f) {
          return Control_Bind.bindFlipped(freeBind)(function ($42) {
              return Control_Applicative.pure(freeApplicative)(k($42));
          })(f);
      };
  });
  var freeBind = new Control_Bind.Bind(function () {
      return freeApply;
  }, function (v) {
      return function (k) {
          return new Free(v.value0, Data_CatList.snoc(v.value1)(Unsafe_Coerce.unsafeCoerce(k)));
      };
  });
  var freeApply = new Control_Apply.Apply(function () {
      return freeFunctor;
  }, Control_Monad.ap(freeMonad));
  var freeApplicative = new Control_Applicative.Applicative(function () {
      return freeApply;
  }, function ($43) {
      return fromView(Return.create($43));
  });
  var liftF = function (f) {
      return fromView(new Bind(Unsafe_Coerce.unsafeCoerce(f), function ($44) {
          return Control_Applicative.pure(freeApplicative)(Unsafe_Coerce.unsafeCoerce($44));
      }));
  };
  exports["liftF"] = liftF;
  exports["runFreeM"] = runFreeM;
  exports["freeFunctor"] = freeFunctor;
  exports["freeBind"] = freeBind;
  exports["freeApplicative"] = freeApplicative;
  exports["freeApply"] = freeApply;
  exports["freeMonad"] = freeMonad;
})(PS["Control.Monad.Free"] = PS["Control.Monad.Free"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Either = PS["Data.Either"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Function = PS["Data.Function"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var StateT = function (x) {
      return x;
  }; 
  var functorStateT = function (dictFunctor) {
      return new Data_Functor.Functor(function (f) {
          return function (v) {
              return function (s) {
                  return Data_Functor.map(dictFunctor)(function (v1) {
                      return new Data_Tuple.Tuple(f(v1.value0), v1.value1);
                  })(v(s));
              };
          };
      });
  };
  var monadStateT = function (dictMonad) {
      return new Control_Monad.Monad(function () {
          return applicativeStateT(dictMonad);
      }, function () {
          return bindStateT(dictMonad);
      });
  };
  var bindStateT = function (dictMonad) {
      return new Control_Bind.Bind(function () {
          return applyStateT(dictMonad);
      }, function (v) {
          return function (f) {
              return function (s) {
                  return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(v(s))(function (v1) {
                      var $60 = f(v1.value0);
                      return $60(v1.value1);
                  });
              };
          };
      });
  };
  var applyStateT = function (dictMonad) {
      return new Control_Apply.Apply(function () {
          return functorStateT(((dictMonad["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]());
      }, Control_Monad.ap(monadStateT(dictMonad)));
  };
  var applicativeStateT = function (dictMonad) {
      return new Control_Applicative.Applicative(function () {
          return applyStateT(dictMonad);
      }, function (a) {
          return function (s) {
              return Data_Function.apply(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]()))(new Data_Tuple.Tuple(a, s));
          };
      });
  };
  var monadStateStateT = function (dictMonad) {
      return new Control_Monad_State_Class.MonadState(function () {
          return monadStateT(dictMonad);
      }, function (f) {
          return Data_Function.apply(StateT)(function ($95) {
              return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(f($95));
          });
      });
  };
  exports["StateT"] = StateT;
  exports["functorStateT"] = functorStateT;
  exports["applyStateT"] = applyStateT;
  exports["applicativeStateT"] = applicativeStateT;
  exports["bindStateT"] = bindStateT;
  exports["monadStateT"] = monadStateT;
  exports["monadStateStateT"] = monadStateStateT;
})(PS["Control.Monad.State.Trans"] = PS["Control.Monad.State.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var WriterT = function (x) {
      return x;
  };
  var runWriterT = function (v) {
      return v;
  };
  var monadTransWriterT = function (dictMonoid) {
      return new Control_Monad_Trans.MonadTrans(function (dictMonad) {
          return function (m) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(m)(function (v) {
                  return Data_Function.apply(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]()))(new Data_Tuple.Tuple(v, Data_Monoid.mempty(dictMonoid)));
              });
          };
      });
  };
  var mapWriterT = function (f) {
      return function (v) {
          return f(v);
      };
  };
  var functorWriterT = function (dictFunctor) {
      return new Data_Functor.Functor(function (f) {
          return Data_Function.apply(mapWriterT)(Data_Functor.map(dictFunctor)(function (v) {
              return new Data_Tuple.Tuple(f(v.value0), v.value1);
          }));
      });
  };
  var execWriterT = function (dictFunctor) {
      return function (v) {
          return Data_Functor.map(dictFunctor)(Data_Tuple.snd)(v);
      };
  };
  var applyWriterT = function (dictSemigroup) {
      return function (dictApply) {
          return new Control_Apply.Apply(function () {
              return functorWriterT(dictApply["__superclass_Data.Functor.Functor_0"]());
          }, function (v) {
              return function (v1) {
                  var k = function (v3) {
                      return function (v4) {
                          return new Data_Tuple.Tuple(v3.value0(v4.value0), Data_Semigroup.append(dictSemigroup)(v3.value1)(v4.value1));
                      };
                  };
                  return Control_Apply.apply(dictApply)(Data_Functor.map(dictApply["__superclass_Data.Functor.Functor_0"]())(k)(v))(v1);
              };
          });
      };
  };
  var bindWriterT = function (dictSemigroup) {
      return function (dictMonad) {
          return new Control_Bind.Bind(function () {
              return applyWriterT(dictSemigroup)((dictMonad["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]());
          }, function (v) {
              return function (k) {
                  return Data_Function.apply(WriterT)(Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(v)(function (v1) {
                      return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())((function () {
                          var $74 = k(v1.value0);
                          return $74;
                      })())(function (v2) {
                          return Data_Function.apply(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]()))(new Data_Tuple.Tuple(v2.value0, Data_Semigroup.append(dictSemigroup)(v1.value1)(v2.value1)));
                      });
                  }));
              };
          });
      };
  };
  var applicativeWriterT = function (dictMonoid) {
      return function (dictApplicative) {
          return new Control_Applicative.Applicative(function () {
              return applyWriterT(dictMonoid["__superclass_Data.Semigroup.Semigroup_0"]())(dictApplicative["__superclass_Control.Apply.Apply_0"]());
          }, function (a) {
              return Data_Function.apply(WriterT)(Data_Function.apply(Control_Applicative.pure(dictApplicative))(new Data_Tuple.Tuple(a, Data_Monoid.mempty(dictMonoid))));
          });
      };
  };
  var monadWriterT = function (dictMonoid) {
      return function (dictMonad) {
          return new Control_Monad.Monad(function () {
              return applicativeWriterT(dictMonoid)(dictMonad["__superclass_Control.Applicative.Applicative_0"]());
          }, function () {
              return bindWriterT(dictMonoid["__superclass_Data.Semigroup.Semigroup_0"]())(dictMonad);
          });
      };
  };
  var monadStateWriterT = function (dictMonoid) {
      return function (dictMonadState) {
          return new Control_Monad_State_Class.MonadState(function () {
              return monadWriterT(dictMonoid)(dictMonadState["__superclass_Control.Monad.Monad_0"]());
          }, function (f) {
              return Control_Monad_Trans.lift(monadTransWriterT(dictMonoid))(dictMonadState["__superclass_Control.Monad.Monad_0"]())(Control_Monad_State_Class.state(dictMonadState)(f));
          });
      };
  };
  var monadWriterWriterT = function (dictMonoid) {
      return function (dictMonad) {
          return new Control_Monad_Writer_Class.MonadWriter(function () {
              return monadWriterT(dictMonoid)(dictMonad);
          }, function (v) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(v)(function (v1) {
                  return Data_Function.apply(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]()))(new Data_Tuple.Tuple(new Data_Tuple.Tuple(v1.value0, v1.value1), v1.value1));
              });
          }, function (v) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(v)(function (v1) {
                  return Data_Function.apply(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]()))(new Data_Tuple.Tuple(v1.value0.value0, v1.value0.value1(v1.value1)));
              });
          }, function ($107) {
              return WriterT(Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())($107));
          });
      };
  };
  exports["WriterT"] = WriterT;
  exports["execWriterT"] = execWriterT;
  exports["mapWriterT"] = mapWriterT;
  exports["runWriterT"] = runWriterT;
  exports["functorWriterT"] = functorWriterT;
  exports["applyWriterT"] = applyWriterT;
  exports["applicativeWriterT"] = applicativeWriterT;
  exports["bindWriterT"] = bindWriterT;
  exports["monadWriterT"] = monadWriterT;
  exports["monadTransWriterT"] = monadTransWriterT;
  exports["monadStateWriterT"] = monadStateWriterT;
  exports["monadWriterWriterT"] = monadWriterWriterT;
})(PS["Control.Monad.Writer.Trans"] = PS["Control.Monad.Writer.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Cont_Trans = PS["Control.Monad.Cont.Trans"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Except_Trans = PS["Control.Monad.Except.Trans"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_List_Trans = PS["Control.Monad.List.Trans"];
  var Control_Monad_Maybe_Trans = PS["Control.Monad.Maybe.Trans"];
  var Control_Monad_Reader_Trans = PS["Control.Monad.Reader.Trans"];
  var Control_Monad_RWS_Trans = PS["Control.Monad.RWS.Trans"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Monoid = PS["Data.Monoid"];
  var Control_Category = PS["Control.Category"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var Affable = function (fromAff) {
      this.fromAff = fromAff;
  };
  var fromAff = function (dict) {
      return dict.fromAff;
  };
  var fromEff = function (dictAffable) {
      return function (eff) {
          return fromAff(dictAffable)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(eff));
      };
  };
  var affableFree = function (dictAffable) {
      return new Affable(function ($28) {
          return Control_Monad_Free.liftF(fromAff(dictAffable)($28));
      });
  };
  var affableAff = new Affable(Control_Category.id(Control_Category.categoryFn));
  exports["Affable"] = Affable;
  exports["fromAff"] = fromAff;
  exports["fromEff"] = fromEff;
  exports["affableAff"] = affableAff;
  exports["affableFree"] = affableFree;
})(PS["Control.Monad.Aff.Free"] = PS["Control.Monad.Aff.Free"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Eff_Unsafe = PS["Control.Monad.Eff.Unsafe"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var unsafeThrowException = function ($0) {
      return Control_Monad_Eff_Unsafe.unsafePerformEff(Control_Monad_Eff_Exception.throwException($0));
  };
  var unsafeThrow = function ($1) {
      return unsafeThrowException(Control_Monad_Eff_Exception.error($1));
  };
  exports["unsafeThrow"] = unsafeThrow;
  exports["unsafeThrowException"] = unsafeThrowException;
})(PS["Control.Monad.Eff.Exception.Unsafe"] = PS["Control.Monad.Eff.Exception.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var runState = function (v) {
      return function ($14) {
          return Data_Identity.runIdentity(v($14));
      };
  };
  exports["runState"] = runState;
})(PS["Control.Monad.State"] = PS["Control.Monad.State"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var runWriter = function ($0) {
      return Data_Identity.runIdentity(Control_Monad_Writer_Trans.runWriterT($0));
  };
  exports["runWriter"] = runWriter;
})(PS["Control.Monad.Writer"] = PS["Control.Monad.Writer"] || {});
(function(exports) {
    "use strict";

  exports.eventListener = function (fn) {
    return function (event) {
      return fn(event)();
    };
  };

  exports.addEventListener = function (type) {
    return function (listener) {
      return function (useCapture) {
        return function (target) {
          return function () {
            target.addEventListener(type, listener, useCapture);
            return {};
          };
        };
      };
    };
  };
})(PS["DOM.Event.EventTarget"] = PS["DOM.Event.EventTarget"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["DOM.Event.EventTarget"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var DOM = PS["DOM"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  exports["addEventListener"] = $foreign.addEventListener;
  exports["eventListener"] = $foreign.eventListener;
})(PS["DOM.Event.EventTarget"] = PS["DOM.Event.EventTarget"] || {});
(function(exports) {
  /* global window */
  "use strict";

  exports.window = function () {
    return window;
  };
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
    "use strict";

  exports._readHTMLElement = function (failure) {
    return function (success) {
      return function (value) {
        var tag = Object.prototype.toString.call(value);
        if (tag.indexOf("[object HTML") === 0 && tag.indexOf("Element]") === tag.length - 8) {
          return success(value);
        } else {
          return failure(tag);
        }
      };
    };
  };
})(PS["DOM.HTML.Types"] = PS["DOM.HTML.Types"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // jshint maxparams: 1
  exports.toForeign = function (value) {
    return value;
  };

  exports.unsafeFromForeign = function (value) {
    return value;
  };

  exports.typeOf = function (value) {
    return typeof value;
  };

  exports.tagOf = function (value) {
    return Object.prototype.toString.call(value).slice(8, -1);
  };

  exports.isNull = function (value) {
    return value === null;
  };

  exports.isUndefined = function (value) {
    return value === undefined;
  };
})(PS["Data.Foreign"] = PS["Data.Foreign"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.toLower = function (s) {
    return s.toLowerCase();
  };
})(PS["Data.String"] = PS["Data.String"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.String"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String_Unsafe = PS["Data.String.Unsafe"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Function = PS["Data.Function"];
  exports["toLower"] = $foreign.toLower;
})(PS["Data.String"] = PS["Data.String"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Foreign"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_Int = PS["Data.Int"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Eq = PS["Data.Eq"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Function = PS["Data.Function"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var TypeMismatch = (function () {
      function TypeMismatch(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      TypeMismatch.create = function (value0) {
          return function (value1) {
              return new TypeMismatch(value0, value1);
          };
      };
      return TypeMismatch;
  })();
  var ErrorAtProperty = (function () {
      function ErrorAtProperty(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      ErrorAtProperty.create = function (value0) {
          return function (value1) {
              return new ErrorAtProperty(value0, value1);
          };
      };
      return ErrorAtProperty;
  })();
  var unsafeReadTagged = function (tag) {
      return function (value) {
          if ($foreign.tagOf(value) === tag) {
              return Control_Applicative.pure(Data_Either.applicativeEither)($foreign.unsafeFromForeign(value));
          };
          return new Data_Either.Left(new TypeMismatch(tag, $foreign.tagOf(value)));
      };
  }; 
  var readString = unsafeReadTagged("String");
  exports["TypeMismatch"] = TypeMismatch;
  exports["ErrorAtProperty"] = ErrorAtProperty;
  exports["readString"] = readString;
  exports["unsafeReadTagged"] = unsafeReadTagged;
  exports["isNull"] = $foreign.isNull;
  exports["isUndefined"] = $foreign.isUndefined;
  exports["toForeign"] = $foreign.toForeign;
  exports["typeOf"] = $foreign.typeOf;
})(PS["Data.Foreign"] = PS["Data.Foreign"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.fromFoldableImpl = (function () {
    // jshint maxparams: 2
    function Cons(head, tail) {
      this.head = head;
      this.tail = tail;
    }
    var emptyList = {};

    function curryCons(head) {
      return function (tail) {
        return new Cons(head, tail);
      };
    }

    function listToArray(list) {
      var result = [];
      var count = 0;
      while (list !== emptyList) {
        result[count++] = list.head;
        list = list.tail;
      }
      return result;
    }

    return function (foldr) {
      return function (xs) {
        return listToArray(foldr(curryCons)(emptyList)(xs));
      };
    };
  })();
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Array"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unfoldable = PS["Data.Unfoldable"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Function = PS["Data.Function"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Eq = PS["Data.Eq"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_Semiring = PS["Data.Semiring"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Category = PS["Control.Category"];
  var fromFoldable = function (dictFoldable) {
      return $foreign.fromFoldableImpl(Data_Foldable.foldr(dictFoldable));
  };
  exports["fromFoldable"] = fromFoldable;
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foreign.Index

  // jshint maxparams: 4
  exports.unsafeReadPropImpl = function (f, s, key, value) {
    return value == null ? f : s(value[key]);
  };

  // jshint maxparams: 2
  exports.unsafeHasOwnProperty = function (prop, value) {
    return Object.prototype.hasOwnProperty.call(value, prop);
  };

  exports.unsafeHasProperty = function (prop, value) {
    return prop in value;
  };
})(PS["Data.Foreign.Index"] = PS["Data.Foreign.Index"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Foreign.Index"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Eq = PS["Data.Eq"];        
  var Index = function (errorAt, hasOwnProperty, hasProperty, ix) {
      this.errorAt = errorAt;
      this.hasOwnProperty = hasOwnProperty;
      this.hasProperty = hasProperty;
      this.ix = ix;
  };
  var unsafeReadProp = function (k) {
      return function (value) {
          return Data_Function_Uncurried.runFn4($foreign.unsafeReadPropImpl)(new Data_Either.Left(new Data_Foreign.TypeMismatch("object", Data_Foreign.typeOf(value))))(Control_Applicative.pure(Data_Either.applicativeEither))(k)(value);
      };
  };
  var prop = unsafeReadProp;
  var ix = function (dict) {
      return dict.ix;
  };                         
  var hasPropertyImpl = function (v) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Data_Foreign.typeOf(value) === "object" || Data_Foreign.typeOf(value) === "function") {
              return Data_Function_Uncurried.runFn2($foreign.unsafeHasProperty)(v)(value);
          };
          return false;
      };
  };
  var hasProperty = function (dict) {
      return dict.hasProperty;
  };
  var hasOwnPropertyImpl = function (v) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Data_Foreign.typeOf(value) === "object" || Data_Foreign.typeOf(value) === "function") {
              return Data_Function_Uncurried.runFn2($foreign.unsafeHasOwnProperty)(v)(value);
          };
          return false;
      };
  };                                                                                                                         
  var indexString = new Index(Data_Foreign.ErrorAtProperty.create, hasOwnPropertyImpl, hasPropertyImpl, Data_Function.flip(prop));
  var hasOwnProperty = function (dict) {
      return dict.hasOwnProperty;
  };
  var errorAt = function (dict) {
      return dict.errorAt;
  };
  exports["Index"] = Index;
  exports["errorAt"] = errorAt;
  exports["hasOwnProperty"] = hasOwnProperty;
  exports["hasProperty"] = hasProperty;
  exports["ix"] = ix;
  exports["prop"] = prop;
  exports["indexString"] = indexString;
})(PS["Data.Foreign.Index"] = PS["Data.Foreign.Index"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Array = PS["Data.Array"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];
  var Data_Foreign_Null = PS["Data.Foreign.Null"];
  var Data_Foreign_NullOrUndefined = PS["Data.Foreign.NullOrUndefined"];
  var Data_Foreign_Undefined = PS["Data.Foreign.Undefined"];
  var Data_Traversable = PS["Data.Traversable"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Semiring = PS["Data.Semiring"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var IsForeign = function (read) {
      this.read = read;
  };
  var stringIsForeign = new IsForeign(Data_Foreign.readString);
  var read = function (dict) {
      return dict.read;
  };
  var readWith = function (dictIsForeign) {
      return function (f) {
          return function (value) {
              return Data_Either.either(function ($8) {
                  return Data_Either.Left.create(f($8));
              })(Data_Either.Right.create)(read(dictIsForeign)(value));
          };
      };
  };
  var readProp = function (dictIsForeign) {
      return function (dictIndex) {
          return function (prop) {
              return function (value) {
                  return Control_Bind.bind(Data_Either.bindEither)(Data_Foreign_Index.ix(dictIndex)(value)(prop))(readWith(dictIsForeign)(Data_Foreign_Index.errorAt(dictIndex)(prop)));
              };
          };
      };
  };
  exports["IsForeign"] = IsForeign;
  exports["read"] = read;
  exports["readProp"] = readProp;
  exports["readWith"] = readWith;
  exports["stringIsForeign"] = stringIsForeign;
})(PS["Data.Foreign.Class"] = PS["Data.Foreign.Class"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["DOM.HTML.Types"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var windowToEventTarget = Unsafe_Coerce.unsafeCoerce;                        
  var readHTMLElement = $foreign._readHTMLElement(function ($0) {
      return Data_Either.Left.create(Data_Foreign.TypeMismatch.create("HTMLElement")($0));
  })(Data_Either.Right.create);                                          
  var htmlElementToNode = Unsafe_Coerce.unsafeCoerce;   
  var htmlDocumentToParentNode = Unsafe_Coerce.unsafeCoerce;
  exports["htmlDocumentToParentNode"] = htmlDocumentToParentNode;
  exports["htmlElementToNode"] = htmlElementToNode;
  exports["readHTMLElement"] = readHTMLElement;
  exports["windowToEventTarget"] = windowToEventTarget;
})(PS["DOM.HTML.Types"] = PS["DOM.HTML.Types"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["DOM.HTML"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["window"] = $foreign.window;
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var load = "load";
  exports["load"] = load;
})(PS["DOM.HTML.Event.EventTypes"] = PS["DOM.HTML.Event.EventTypes"] || {});
(function(exports) {
    "use strict";

  exports.document = function (window) {
    return function () {
      return window.document;
    };
  };
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["DOM.HTML.Window"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["document"] = $foreign.document;
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
    "use strict";

  exports.appendChild = function (node) {
    return function (parent) {
      return function () {
        return parent.appendChild(node);
      };
    };
  };
})(PS["DOM.Node.Node"] = PS["DOM.Node.Node"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports["null"] = null;

  exports.nullable = function(a, r, f) {
      return a == null ? r : f(a);
  };

  exports.notNull = function(x) {
      return x;
  };
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Nullable"];
  var Prelude = PS["Prelude"];
  var Data_Function = PS["Data.Function"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Show = PS["Data.Show"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Ord = PS["Data.Ord"];        
  var toNullable = Data_Maybe.maybe($foreign["null"])($foreign.notNull);
  var toMaybe = function (n) {
      return Data_Function_Uncurried.runFn3($foreign.nullable)(n)(Data_Maybe.Nothing.value)(Data_Maybe.Just.create);
  };
  exports["toMaybe"] = toMaybe;
  exports["toNullable"] = toNullable;
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["DOM.Node.Node"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Enum = PS["Data.Enum"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Maybe = PS["Data.Maybe"];
  var DOM = PS["DOM"];
  var DOM_Node_NodeType = PS["DOM.Node.NodeType"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  exports["appendChild"] = $foreign.appendChild;
})(PS["DOM.Node.Node"] = PS["DOM.Node.Node"] || {});
(function(exports) {
    "use strict";                                             

  exports.querySelector = function (selector) {
    return function (node) {
      return function () {
        return node.querySelector(selector);
      };
    };
  };
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["DOM.Node.ParentNode"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  exports["querySelector"] = $foreign.querySelector;
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Unsafe_Coerce = PS["Unsafe.Coerce"];        
  var runExistsR = Unsafe_Coerce.unsafeCoerce;
  var mkExistsR = Unsafe_Coerce.unsafeCoerce;
  exports["mkExistsR"] = mkExistsR;
  exports["runExistsR"] = runExistsR;
})(PS["Data.ExistsR"] = PS["Data.ExistsR"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Lazy

  exports.defer = function () {

    function Defer(thunk) {
      if (this instanceof Defer) {
        this.thunk = thunk;
        return this;
      } else {
        return new Defer(thunk);
      }
    }

    Defer.prototype.force = function () {
      var value = this.thunk();
      delete this.thunk;
      this.force = function () {
        return value;
      };
      return value;
    };

    return Defer;

  }();

  exports.force = function (l) {
    return l.force();
  };
})(PS["Data.Lazy"] = PS["Data.Lazy"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.Lazy"];
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Lazy = PS["Control.Lazy"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Ring = PS["Data.Ring"];
  var Data_CommutativeRing = PS["Data.CommutativeRing"];
  var Data_EuclideanRing = PS["Data.EuclideanRing"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Field = PS["Data.Field"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Function = PS["Data.Function"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Show = PS["Data.Show"];
  var Data_Unit = PS["Data.Unit"];
  exports["defer"] = $foreign.defer;
  exports["force"] = $foreign.force;
})(PS["Data.Lazy"] = PS["Data.Lazy"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Category = PS["Control.Category"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Function = PS["Data.Function"];
  var Data_Semiring = PS["Data.Semiring"];        
  var Leaf = (function () {
      function Leaf() {

      };
      Leaf.value = new Leaf();
      return Leaf;
  })();
  var Two = (function () {
      function Two(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Two.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Two(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Two;
  })();
  var Three = (function () {
      function Three(value0, value1, value2, value3, value4, value5, value6) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
          this.value6 = value6;
      };
      Three.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return function (value6) {
                                  return new Three(value0, value1, value2, value3, value4, value5, value6);
                              };
                          };
                      };
                  };
              };
          };
      };
      return Three;
  })();
  var TwoLeft = (function () {
      function TwoLeft(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoLeft(value0, value1, value2);
              };
          };
      };
      return TwoLeft;
  })();
  var TwoRight = (function () {
      function TwoRight(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoRight(value0, value1, value2);
              };
          };
      };
      return TwoRight;
  })();
  var ThreeLeft = (function () {
      function ThreeLeft(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeLeft(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeLeft;
  })();
  var ThreeMiddle = (function () {
      function ThreeMiddle(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeMiddle.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeMiddle(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeMiddle;
  })();
  var ThreeRight = (function () {
      function ThreeRight(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeRight(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeRight;
  })();
  var KickUp = (function () {
      function KickUp(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      KickUp.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new KickUp(value0, value1, value2, value3);
                  };
              };
          };
      };
      return KickUp;
  })();
  var lookup = function (dictOrd) {
      return Partial_Unsafe.unsafePartial(function (dictPartial) {
          return function (k) {
              return function (tree) {
                  if (tree instanceof Leaf) {
                      return Data_Maybe.Nothing.value;
                  };
                  var comp = Data_Ord.compare(dictOrd);
                  var __unused = function (dictPartial1) {
                      return function ($dollar35) {
                          return $dollar35;
                      };
                  };
                  return __unused(dictPartial)((function () {
                      if (tree instanceof Two) {
                          var $147 = comp(k)(tree.value1);
                          if ($147 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(tree.value2);
                          };
                          if ($147 instanceof Data_Ordering.LT) {
                              return lookup(dictOrd)(k)(tree.value0);
                          };
                          return lookup(dictOrd)(k)(tree.value3);
                      };
                      if (tree instanceof Three) {
                          var $152 = comp(k)(tree.value1);
                          if ($152 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(tree.value2);
                          };
                          var $154 = comp(k)(tree.value4);
                          if ($154 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(tree.value5);
                          };
                          if ($152 instanceof Data_Ordering.LT) {
                              return lookup(dictOrd)(k)(tree.value0);
                          };
                          if ($154 instanceof Data_Ordering.GT) {
                              return lookup(dictOrd)(k)(tree.value6);
                          };
                          return lookup(dictOrd)(k)(tree.value3);
                      };
                      throw new Error("Failed pattern match at Data.Map line 132, column 10 - line 146, column 39: " + [ tree.constructor.name ]);
                  })());
              };
          };
      });
  }; 
  var fromZipper = function (__copy_dictOrd) {
      return function (__copy_v) {
          return function (__copy_tree) {
              var dictOrd = __copy_dictOrd;
              var v = __copy_v;
              var tree = __copy_tree;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return tree;
                  };
                  if (v instanceof Data_List.Cons) {
                      if (v.value0 instanceof TwoLeft) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Two(tree, v.value0.value0, v.value0.value1, v.value0.value2);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof TwoRight) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Two(v.value0.value0, v.value0.value1, v.value0.value2, tree);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeLeft) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Three(tree, v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeMiddle) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Three(v.value0.value0, v.value0.value1, v.value0.value2, tree, v.value0.value3, v.value0.value4, v.value0.value5);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeRight) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Three(v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5, tree);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.Map line 223, column 3 - line 228, column 88: " + [ v.value0.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Data.Map line 221, column 1 - line 221, column 27: " + [ v.constructor.name, tree.constructor.name ]);
              };
          };
      };
  };
  var insert = function (dictOrd) {
      var up = function (__copy_v) {
          return function (__copy_v1) {
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return new Two(v1.value0, v1.value1, v1.value2, v1.value3);
                  };
                  if (v instanceof Data_List.Cons) {
                      if (v.value0 instanceof TwoLeft) {
                          return fromZipper(dictOrd)(v.value1)(new Three(v1.value0, v1.value1, v1.value2, v1.value3, v.value0.value0, v.value0.value1, v.value0.value2));
                      };
                      if (v.value0 instanceof TwoRight) {
                          return fromZipper(dictOrd)(v.value1)(new Three(v.value0.value0, v.value0.value1, v.value0.value2, v1.value0, v1.value1, v1.value2, v1.value3));
                      };
                      if (v.value0 instanceof ThreeLeft) {
                          var __tco_v = v.value1;
                          var __tco_v1 = new KickUp(new Two(v1.value0, v1.value1, v1.value2, v1.value3), v.value0.value0, v.value0.value1, new Two(v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5));
                          v = __tco_v;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeMiddle) {
                          var __tco_v = v.value1;
                          var __tco_v1 = new KickUp(new Two(v.value0.value0, v.value0.value1, v.value0.value2, v1.value0), v1.value1, v1.value2, new Two(v1.value3, v.value0.value3, v.value0.value4, v.value0.value5));
                          v = __tco_v;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeRight) {
                          var __tco_v = v.value1;
                          var __tco_v1 = new KickUp(new Two(v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3), v.value0.value4, v.value0.value5, new Two(v1.value0, v1.value1, v1.value2, v1.value3));
                          v = __tco_v;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.Map line 259, column 5 - line 264, column 104: " + [ v.value0.constructor.name, v1.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Data.Map line 257, column 3 - line 257, column 54: " + [ v.constructor.name, v1.constructor.name ]);
              };
          };
      };
      var comp = Data_Ord.compare(dictOrd);
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy_v) {
                  return function (__copy_v1) {
                      var ctx = __copy_ctx;
                      var k = __copy_k;
                      var v = __copy_v;
                      var v1 = __copy_v1;
                      tco: while (true) {
                          if (v1 instanceof Leaf) {
                              return up(ctx)(new KickUp(Leaf.value, k, v, Leaf.value));
                          };
                          if (v1 instanceof Two) {
                              var $275 = comp(k)(v1.value1);
                              if ($275 instanceof Data_Ordering.EQ) {
                                  return fromZipper(dictOrd)(ctx)(new Two(v1.value0, k, v, v1.value3));
                              };
                              if ($275 instanceof Data_Ordering.LT) {
                                  var __tco_ctx = new Data_List.Cons(new TwoLeft(v1.value1, v1.value2, v1.value3), ctx);
                                  var __tco_k = k;
                                  var __tco_v = v;
                                  var __tco_v1 = v1.value0;
                                  ctx = __tco_ctx;
                                  k = __tco_k;
                                  v = __tco_v;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              var __tco_ctx = new Data_List.Cons(new TwoRight(v1.value0, v1.value1, v1.value2), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value3;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (v1 instanceof Three) {
                              var $280 = comp(k)(v1.value1);
                              if ($280 instanceof Data_Ordering.EQ) {
                                  return fromZipper(dictOrd)(ctx)(new Three(v1.value0, k, v, v1.value3, v1.value4, v1.value5, v1.value6));
                              };
                              var $282 = comp(k)(v1.value4);
                              if ($282 instanceof Data_Ordering.EQ) {
                                  return fromZipper(dictOrd)(ctx)(new Three(v1.value0, v1.value1, v1.value2, v1.value3, k, v, v1.value6));
                              };
                              if ($280 instanceof Data_Ordering.LT) {
                                  var __tco_ctx = new Data_List.Cons(new ThreeLeft(v1.value1, v1.value2, v1.value3, v1.value4, v1.value5, v1.value6), ctx);
                                  var __tco_k = k;
                                  var __tco_v = v;
                                  var __tco_v1 = v1.value0;
                                  ctx = __tco_ctx;
                                  k = __tco_k;
                                  v = __tco_v;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              if ($280 instanceof Data_Ordering.GT && $282 instanceof Data_Ordering.LT) {
                                  var __tco_ctx = new Data_List.Cons(new ThreeMiddle(v1.value0, v1.value1, v1.value2, v1.value4, v1.value5, v1.value6), ctx);
                                  var __tco_k = k;
                                  var __tco_v = v;
                                  var __tco_v1 = v1.value3;
                                  ctx = __tco_ctx;
                                  k = __tco_k;
                                  v = __tco_v;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(v1.value0, v1.value1, v1.value2, v1.value3, v1.value4, v1.value5), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.Map line 240, column 3 - line 240, column 52: " + [ ctx.constructor.name, k.constructor.name, v.constructor.name, v1.constructor.name ]);
                      };
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var empty = Leaf.value;
  exports["empty"] = empty;
  exports["insert"] = insert;
  exports["lookup"] = lookup;
})(PS["Data.Map"] = PS["Data.Map"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports._copyEff = function (m) {
    return function () {
      var r = {};
      for (var k in m) {
        if (m.hasOwnProperty(k)) {
          r[k] = m[k];
        }
      }
      return r;
    };
  };

  exports.empty = {};

  exports.runST = function (f) {
    return f;
  };

  // jshint maxparams: 1
  exports.all = function (f) {
    return function (m) {
      for (var k in m) {
        if (m.hasOwnProperty(k) && !f(k)(m[k])) return false;
      }
      return true;
    };
  };

  // jshint maxparams: 4
  exports._lookup = function (no, yes, k, m) {
    return k in m ? yes(m[k]) : no;
  };

  function _collect(f) {
    return function (m) {
      var r = [];
      for (var k in m) {
        if (m.hasOwnProperty(k)) {
          r.push(f(k)(m[k]));
        }
      }
      return r;
    };
  }

  exports._collect = _collect;

  exports.keys = Object.keys || _collect(function (k) {
    return function () { return k; };
  });
})(PS["Data.StrMap"] = PS["Data.StrMap"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.poke = function (m) {
    return function (k) {
      return function (v) {
        return function () {
          m[k] = v;
          return m;
        };
      };
    };
  };

  exports["delete"] = function (m) {
    return function (k) {
      return function () {
        delete m[k];
        return m;
      };
    };
  };
})(PS["Data.StrMap.ST"] = PS["Data.StrMap.ST"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.StrMap.ST"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_ST = PS["Control.Monad.ST"];
  var Data_Maybe = PS["Data.Maybe"];
  exports["delete"] = $foreign["delete"];
  exports["poke"] = $foreign.poke;
})(PS["Data.StrMap.ST"] = PS["Data.StrMap.ST"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.StrMap"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_ST = PS["Control.Monad.ST"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_StrMap_ST = PS["Data.StrMap.ST"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Category = PS["Control.Category"];
  var Data_Eq = PS["Data.Eq"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var thawST = $foreign._copyEff;
  var pureST = function (f) {
      return Control_Monad_Eff.runPure($foreign.runST(f));
  };
  var mutate = function (f) {
      return function (m) {
          return pureST(function __do() {
              var v = thawST(m)();
              f(v)();
              return v;
          });
      };
  };                                                                                                 
  var lookup = Data_Function_Uncurried.runFn4($foreign._lookup)(Data_Maybe.Nothing.value)(Data_Maybe.Just.create);
  var isEmpty = $foreign.all(function (v) {
      return function (v1) {
          return false;
      };
  });
  var insert = function (k) {
      return function (v) {
          return mutate(function (s) {
              return Data_StrMap_ST.poke(s)(k)(v);
          });
      };
  };
  var $$delete = function (k) {
      return mutate(function (s) {
          return Data_StrMap_ST["delete"](s)(k);
      });
  };
  exports["delete"] = $$delete;
  exports["insert"] = insert;
  exports["isEmpty"] = isEmpty;
  exports["lookup"] = lookup;
  exports["pureST"] = pureST;
  exports["thawST"] = thawST;
  exports["empty"] = $foreign.empty;
  exports["keys"] = $foreign.keys;
})(PS["Data.StrMap"] = PS["Data.StrMap"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports["regex'"] = function (left) {
    return function (right) {
      return function (s1) {
        return function (s2) {
          try {
            return right(new RegExp(s1, s2));
          } catch (e) {
            return left(e.message);
          }
        };
      };
    };
  };

  exports._match = function (just) {
    return function (nothing) {
      return function (r) {
        return function (s) {
          var m = s.match(r);
          if (m == null) {
            return nothing;
          } else {
            var list = [];
            for (var i = 0; i < m.length; i++) {
              list.push(m[i] == null ? nothing : just(m[i]));
            }
            return just(list);
          }
        };
      };
    };
  };

  exports.replace = function (r) {
    return function (s1) {
      return function (s2) {
        return s2.replace(r, s1);
      };
    };
  };
})(PS["Data.String.Regex"] = PS["Data.String.Regex"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Data.String.Regex"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Function = PS["Data.Function"];                                        
  var renderFlags = function (f) {
      return (function () {
          if (f.global) {
              return "g";
          };
          if (!f.global) {
              return "";
          };
          throw new Error("Failed pattern match at Data.String.Regex line 72, column 4 - line 72, column 32: " + [ f.global.constructor.name ]);
      })() + ((function () {
          if (f.ignoreCase) {
              return "i";
          };
          if (!f.ignoreCase) {
              return "";
          };
          throw new Error("Failed pattern match at Data.String.Regex line 73, column 4 - line 73, column 36: " + [ f.ignoreCase.constructor.name ]);
      })() + ((function () {
          if (f.multiline) {
              return "m";
          };
          if (!f.multiline) {
              return "";
          };
          throw new Error("Failed pattern match at Data.String.Regex line 74, column 4 - line 74, column 35: " + [ f.multiline.constructor.name ]);
      })() + ((function () {
          if (f.sticky) {
              return "y";
          };
          if (!f.sticky) {
              return "";
          };
          throw new Error("Failed pattern match at Data.String.Regex line 75, column 4 - line 75, column 32: " + [ f.sticky.constructor.name ]);
      })() + (function () {
          if (f.unicode) {
              return "u";
          };
          if (!f.unicode) {
              return "";
          };
          throw new Error("Failed pattern match at Data.String.Regex line 76, column 4 - line 76, column 33: " + [ f.unicode.constructor.name ]);
      })())));
  };
  var regex = function (s) {
      return function (f) {
          return Data_Function.apply($foreign["regex'"](Data_Either.Left.create)(Data_Either.Right.create)(s))(renderFlags(f));
      };
  };
  var noFlags = {
      global: false, 
      ignoreCase: false, 
      multiline: false, 
      sticky: false, 
      unicode: false
  };
  var match = $foreign._match(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
  exports["match"] = match;
  exports["noFlags"] = noFlags;
  exports["regex"] = regex;
  exports["renderFlags"] = renderFlags;
  exports["replace"] = $foreign.replace;
})(PS["Data.String.Regex"] = PS["Data.String.Regex"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Data_Generic = PS["Data.Generic"];
  var Data_List = PS["Data.List"];
  var Data_Map = PS["Data.Map"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_String_Regex = PS["Data.String.Regex"];
  var Data_StrMap = PS["Data.StrMap"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Ord = PS["Data.Ord"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Unit = PS["Data.Unit"];        
  var Message = (function () {
      function Message(value0) {
          this.value0 = value0;
      };
      Message.create = function (value0) {
          return new Message(value0);
      };
      return Message;
  })();
  var Echo = (function () {
      function Echo(value0) {
          this.value0 = value0;
      };
      Echo.create = function (value0) {
          return new Echo(value0);
      };
      return Echo;
  })();
  var Heading = (function () {
      function Heading(value0) {
          this.value0 = value0;
      };
      Heading.create = function (value0) {
          return new Heading(value0);
      };
      return Heading;
  })();
  var $$Error = (function () {
      function Error(value0) {
          this.value0 = value0;
      };
      Error.create = function (value0) {
          return new Error(value0);
      };
      return Error;
  })();
  var Command = (function () {
      function Command(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Command.create = function (value0) {
          return function (value1) {
              return new Command(value0, value1);
          };
      };
      return Command;
  })();
  var World = (function () {
      function World(value0) {
          this.value0 = value0;
      };
      World.create = function (value0) {
          return new World(value0);
      };
      return World;
  })();
  var Place = (function () {
      function Place(value0) {
          this.value0 = value0;
      };
      Place.create = function (value0) {
          return new Place(value0);
      };
      return Place;
  })();
  var $$Object = (function () {
      function Object(value0) {
          this.value0 = value0;
      };
      Object.create = function (value0) {
          return new Object(value0);
      };
      return Object;
  })();
  var semigroupHistory = new Data_Semigroup.Semigroup(function (v) {
      return function (v1) {
          return Data_Semigroup.append(Data_List.semigroupList)(v)(v1);
      };
  });
  var monoidHistory = new Data_Monoid.Monoid(function () {
      return semigroupHistory;
  }, Data_List.Nil.value);
  var eqCommand = new Data_Eq.Eq(function (v) {
      return function (v1) {
          return v.value0 === v1.value0;
      };
  });
  var ordCommand = new Data_Ord.Ord(function () {
      return eqCommand;
  }, function (v) {
      return function (v1) {
          return Data_Ord.compare(Data_Ord.ordString)(v.value0)(v1.value0);
      };
  });
  exports["Command"] = Command;
  exports["Message"] = Message;
  exports["Echo"] = Echo;
  exports["Heading"] = Heading;
  exports["Error"] = $$Error;
  exports["Object"] = $$Object;
  exports["Place"] = Place;
  exports["World"] = World;
  exports["eqCommand"] = eqCommand;
  exports["ordCommand"] = ordCommand;
  exports["monoidHistory"] = monoidHistory;
  exports["semigroupHistory"] = semigroupHistory;
})(PS["Skald.Internal"] = PS["Skald.Internal"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Map = PS["Data.Map"];
  var Data_Maybe = PS["Data.Maybe"];
  var Skald_Internal_1 = PS["Skald.Internal"];
  var Skald_Internal_1 = PS["Skald.Internal"];        
  var scenery = function (name$prime) {
      return function (description$prime) {
          return new Skald_Internal_1["Object"]({
              name: name$prime, 
              description: description$prime, 
              fixedInPlace: true, 
              commands: Data_Map.empty
          });
      };
  };
  var object = function (name$prime) {
      return function (description$prime) {
          return new Skald_Internal_1["Object"]({
              name: name$prime, 
              description: description$prime, 
              fixedInPlace: false, 
              commands: Data_Map.empty
          });
      };
  };
  var name = function (v) {
      return v.value0.name;
  };
  var insteadOf = function (command1) {
      return function (action) {
          return function (v) {
              return new Skald_Internal_1["Object"]((function () {
                  var $10 = {};
                  for (var $11 in v.value0) {
                      if (v.value0.hasOwnProperty($11)) {
                          $10[$11] = v.value0[$11];
                      };
                  };
                  $10.commands = Data_Map.insert(Skald_Internal_1.ordCommand)(command1)(action)(v.value0.commands);
                  return $10;
              })());
          };
      };
  };
  var fixedInPlace = function (v) {
      return v.value0.fixedInPlace;
  };
  var description = function (v) {
      return v.value0.description;
  };
  var command = function (command1) {
      return function (v) {
          return Data_Map.lookup(Skald_Internal_1.ordCommand)(command1)(v.value0.commands);
      };
  };
  exports["command"] = command;
  exports["description"] = description;
  exports["fixedInPlace"] = fixedInPlace;
  exports["insteadOf"] = insteadOf;
  exports["name"] = name;
  exports["object"] = object;
  exports["scenery"] = scenery;
})(PS["Skald.Object"] = PS["Skald.Object"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_List = PS["Data.List"];
  var Skald_Internal_1 = PS["Skald.Internal"];
  var Skald_Internal_1 = PS["Skald.Internal"];        
  var toList = function (v) {
      return v;
  };
  var singleton = function (entry) {
      return new Data_List.Cons(entry, Data_List.Nil.value);
  };
  var message = Skald_Internal_1.Message.create;
  var heading = Skald_Internal_1.Heading.create;
  var fromList = function (list) {
      return list;
  };
  var error = (Skald_Internal_1["Error"]).create;
  var echo = Skald_Internal_1.Echo.create;
  var cons = function (entry) {
      return function (v) {
          return new Data_List.Cons(entry, v);
      };
  };
  exports["cons"] = cons;
  exports["echo"] = echo;
  exports["error"] = error;
  exports["fromList"] = fromList;
  exports["heading"] = heading;
  exports["message"] = message;
  exports["singleton"] = singleton;
  exports["toList"] = toList;
})(PS["Skald.History"] = PS["Skald.History"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var west = "west";
  var up = "up";              
  var south = "south";        
  var north = "north";
  var east = "east";
  var down = "down";
  exports["down"] = down;
  exports["east"] = east;
  exports["north"] = north;
  exports["south"] = south;
  exports["up"] = up;
  exports["west"] = west;
})(PS["Skald.Direction"] = PS["Skald.Direction"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_List_1 = PS["Data.List"];
  var Data_List_1 = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_StrMap = PS["Data.StrMap"];
  var Skald_Direction = PS["Skald.Direction"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Internal = PS["Skald.Internal"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function = PS["Data.Function"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];        
  var visited = function (v) {
      return v.value0.visited;
  };
  var updateObjects = function (f) {
      return function (v) {
          return new Skald_Internal.Place((function () {
              var $18 = {};
              for (var $19 in v.value0) {
                  if (v.value0.hasOwnProperty($19)) {
                      $18[$19] = v.value0[$19];
                  };
              };
              $18.objects = f(v.value0.objects);
              return $18;
          })());
      };
  };
  var unvisited = function (v) {
      return !v.value0.visited;
  };
  var setVisited = function (visited$prime) {
      return function (v) {
          return new Skald_Internal.Place((function () {
              var $25 = {};
              for (var $26 in v.value0) {
                  if (v.value0.hasOwnProperty($26)) {
                      $25[$26] = v.value0[$26];
                  };
              };
              $25.visited = visited$prime;
              return $25;
          })());
      };
  };
  var removeObject = function (object$prime) {
      return updateObjects(function (v) {
          return Data_StrMap["delete"](Skald_Object_1.name(object$prime))(v);
      });
  };
  var objects = function (v) {
      return v.value0.objects;
  };
  var objectNames = function (v) {
      return Data_List_1.fromFoldable(Data_Foldable.foldableArray)(Data_StrMap.keys(v.value0.objects));
  };
  var object = function (name$prime) {
      return function (v) {
          return Data_StrMap.lookup(name$prime)(v.value0.objects);
      };
  };
  var noObjects = Data_StrMap.empty;
  var noExits = Data_StrMap.empty;
  var place = function (name$prime) {
      return new Skald_Internal.Place({
          name: name$prime, 
          describer: Data_Function["const"](""), 
          exits: noExits, 
          objects: noObjects, 
          visited: false
      });
  };
  var name = function (v) {
      return v.value0.name;
  };
  var exits = function (v) {
      return v.value0.exits;
  };
  var exitName = function (exit) {
      return function (v) {
          return Data_StrMap.lookup(exit)(v.value0.exits);
      };
  };
  var empty = place("An error has occurred");
  var description = function (v) {
      return v.value0.describer(new Skald_Internal.Place(v.value0));
  };
  var addObject = function (object$prime) {
      return updateObjects(function (v) {
          return Data_StrMap.insert(Skald_Object_1.name(object$prime))(object$prime)(v);
      });
  };
  exports["addObject"] = addObject;
  exports["description"] = description;
  exports["empty"] = empty;
  exports["exitName"] = exitName;
  exports["exits"] = exits;
  exports["name"] = name;
  exports["object"] = object;
  exports["objectNames"] = objectNames;
  exports["objects"] = objects;
  exports["place"] = place;
  exports["removeObject"] = removeObject;
  exports["setVisited"] = setVisited;
  exports["unvisited"] = unvisited;
  exports["updateObjects"] = updateObjects;
  exports["visited"] = visited;
})(PS["Skald.Place"] = PS["Skald.Place"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_List_1 = PS["Data.List"];
  var Data_List_1 = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_StrMap_1 = PS["Data.StrMap"];
  var Data_StrMap_1 = PS["Data.StrMap"];
  var Skald_Internal_1 = PS["Skald.Internal"];
  var Skald_Internal_1 = PS["Skald.Internal"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var updatePlaces = function (f) {
      return function (v) {
          return new Skald_Internal_1.World((function () {
              var $17 = {};
              for (var $18 in v.value0) {
                  if (v.value0.hasOwnProperty($18)) {
                      $17[$18] = v.value0[$18];
                  };
              };
              $17.places = f(v.value0.places);
              return $17;
          })());
      };
  };
  var setCommands = function (newCommands) {
      return function (v) {
          return new Skald_Internal_1.World((function () {
              var $37 = {};
              for (var $38 in v.value0) {
                  if (v.value0.hasOwnProperty($38)) {
                      $37[$38] = v.value0[$38];
                  };
              };
              $37.commands = newCommands;
              return $37;
          })());
      };
  };
  var removeFromInventory = function (object) {
      return function (v) {
          return new Skald_Internal_1.World((function () {
              var $42 = {};
              for (var $43 in v.value0) {
                  if (v.value0.hasOwnProperty($43)) {
                      $42[$43] = v.value0[$43];
                  };
              };
              $42.inventory = Data_StrMap_1["delete"](Skald_Object_1.name(object))(v.value0.inventory);
              return $42;
          })());
      };
  };
  var places = function (v) {
      return v.value0.places;
  };
  var setCurrentPlace = function (place$prime) {
      return function (v) {
          return new Skald_Internal_1.World((function () {
              var $50 = {};
              for (var $51 in v.value0) {
                  if (v.value0.hasOwnProperty($51)) {
                      $50[$51] = v.value0[$51];
                  };
              };
              $50.places = Data_StrMap_1.insert(Skald_Place_1.name(place$prime))(place$prime)(places(new Skald_Internal_1.World(v.value0)));
              $50.currentPlaceName = Skald_Place_1.name(place$prime);
              return $50;
          })());
      };
  };
  var place = function (name) {
      return function (world) {
          var $53 = Data_StrMap_1.lookup(name)(places(world));
          if ($53 instanceof Data_Maybe.Just) {
              return $53.value0;
          };
          if ($53 instanceof Data_Maybe.Nothing) {
              return Skald_Place_1.empty;
          };
          throw new Error("Failed pattern match at Skald.World line 80, column 20 - line 82, column 27: " + [ $53.constructor.name ]);
      };
  };
  var item = function (name) {
      return function (v) {
          return Data_StrMap_1.lookup(name)(v.value0.inventory);
      };
  };
  var inventoryNames = function (v) {
      return Data_List_1.fromFoldable(Data_Foldable.foldableArray)(Data_StrMap_1.keys(v.value0.inventory));
  };
  var inventoryIsEmpty = function (v) {
      return Data_StrMap_1.isEmpty(v.value0.inventory);
  };
  var inventory = function (v) {
      return v.value0.inventory;
  };
  var empty = new Skald_Internal_1.World({
      currentPlaceName: "", 
      places: Data_StrMap_1.empty, 
      commands: Data_List_1.Nil.value, 
      inventory: Data_StrMap_1.empty
  });
  var currentPlace = function (v) {
      return place(v.value0.currentPlaceName)(new Skald_Internal_1.World(v.value0));
  };
  var toString = function (world) {
      return "    World\n      { currentPlaceName = \"" + (Skald_Place_1.name(currentPlace(world)) + ("\"\n      , places = " + ("<???>" + ("\n      , commands = " + ("<???>" + ("\n      , inventory = " + ("<???>" + "\n      }")))))));
  };
  var updateCurrentPlace = function (f) {
      return function (world) {
          return setCurrentPlace(f(currentPlace(world)))(world);
      };
  };
  var removeObject = function ($77) {
      return updateCurrentPlace(Skald_Place_1.removeObject($77));
  };
  var commands = function (v) {
      return v.value0.commands;
  };
  var addToInventory = function (object) {
      return function (v) {
          return new Skald_Internal_1.World((function () {
              var $73 = {};
              for (var $74 in v.value0) {
                  if (v.value0.hasOwnProperty($74)) {
                      $73[$74] = v.value0[$74];
                  };
              };
              $73.inventory = Data_StrMap_1.insert(Skald_Object_1.name(object))(object)(v.value0.inventory);
              return $73;
          })());
      };
  };
  var addObject = function ($78) {
      return updateCurrentPlace(Skald_Place_1.addObject($78));
  };
  exports["addObject"] = addObject;
  exports["addToInventory"] = addToInventory;
  exports["commands"] = commands;
  exports["currentPlace"] = currentPlace;
  exports["empty"] = empty;
  exports["inventory"] = inventory;
  exports["inventoryIsEmpty"] = inventoryIsEmpty;
  exports["inventoryNames"] = inventoryNames;
  exports["item"] = item;
  exports["place"] = place;
  exports["places"] = places;
  exports["removeFromInventory"] = removeFromInventory;
  exports["removeObject"] = removeObject;
  exports["setCommands"] = setCommands;
  exports["setCurrentPlace"] = setCurrentPlace;
  exports["toString"] = toString;
  exports["updateCurrentPlace"] = updateCurrentPlace;
  exports["updatePlaces"] = updatePlaces;
})(PS["Skald.World"] = PS["Skald.World"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff_Exception_Unsafe = PS["Control.Monad.Eff.Exception.Unsafe"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_Writer = PS["Control.Monad.Writer"];
  var Data_Either = PS["Data.Either"];
  var Data_List_1 = PS["Data.List"];
  var Data_List_1 = PS["Data.List"];
  var Data_Maybe_1 = PS["Data.Maybe"];
  var Data_Maybe_1 = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var Data_String_Regex_1 = PS["Data.String.Regex"];
  var Data_String_Regex_1 = PS["Data.String.Regex"];
  var Data_Tuple = PS["Data.Tuple"];
  var Skald_History_1 = PS["Skald.History"];
  var Skald_History_1 = PS["Skald.History"];
  var Skald_Internal_1 = PS["Skald.Internal"];
  var Skald_Internal_1 = PS["Skald.Internal"];
  var Skald_Object = PS["Skald.Object"];
  var Skald_Place = PS["Skald.Place"];
  var Skald_World = PS["Skald.World"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Foldable = PS["Data.Foldable"];        
  var normalizeWhitespace = (function () {
      var whitespaceRegex = (function () {
          var $3 = Data_String_Regex_1.regex("\\s+")(Data_String_Regex_1.noFlags);
          if ($3 instanceof Data_Either.Right) {
              return $3.value0;
          };
          if ($3 instanceof Data_Either.Left) {
              return Control_Monad_Eff_Exception_Unsafe.unsafeThrow("normalizeWhitespace failed.");
          };
          throw new Error("Failed pattern match at Skald.Command line 90, column 27 - line 95, column 1: " + [ $3.constructor.name ]);
      })();
      return Data_String_Regex_1.replace(whitespaceRegex)(" ");
  })();
  var insert = function (command$prime) {
      return function (handler) {
          return function (map$prime) {
              return new Data_List_1.Cons(new Data_Tuple.Tuple(command$prime, handler), map$prime);
          };
      };
  };
  var formatParserError = Skald_History_1.error;
  var sayParserError = function ($42) {
      return Control_Monad_Writer_Class.tell(Control_Monad_Writer_Trans.monadWriterWriterT(Skald_Internal_1.monoidHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Skald_History_1.singleton(formatParserError($42)));
  };
  var command = function (string) {
      var $6 = Data_String_Regex_1.regex("^(?:" + (string + ")$"))(Data_String_Regex_1.noFlags);
      if ($6 instanceof Data_Either.Right) {
          return new Skald_Internal_1.Command(string, $6.value0);
      };
      if ($6 instanceof Data_Either.Left) {
          return Control_Monad_Eff_Exception_Unsafe.unsafeThrow("invalid regex");
      };
      throw new Error("Failed pattern match at Skald.Command line 45, column 5 - line 50, column 1: " + [ $6.constructor.name ]);
  };
  var catMaybes = function (a) {
      if (a instanceof Data_List_1.Nil) {
          return Data_List_1.Nil.value;
      };
      if (a instanceof Data_List_1.Cons && a.value0 instanceof Data_Maybe_1.Nothing) {
          return catMaybes(a.value1);
      };
      if (a instanceof Data_List_1.Cons && a.value0 instanceof Data_Maybe_1.Just) {
          return new Data_List_1.Cons(a.value0.value0, catMaybes(a.value1));
      };
      throw new Error("Failed pattern match at Skald.Command line 97, column 15 - line 100, column 36: " + [ a.constructor.name ]);
  };
  var parse = function (field) {
      var predicate = function (v) {
          return Data_Maybe_1.isJust(v.value1.value0);
      };
      var field$prime = normalizeWhitespace(Data_String.toLower(field));
      var matcher = function (v) {
          return new Data_Tuple.Tuple(v.value0, new Data_Tuple.Tuple(Data_String_Regex_1.match(v.value0.value1)(field$prime), v.value1));
      };
      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal_1.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal_1.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v) {
          var $26 = Data_List_1.head(Data_List_1.filter(predicate)(Data_Functor.map(Data_List_1.functorList)(matcher)(Skald_World.commands(v))));
          if ($26 instanceof Data_Maybe_1.Just && $26.value0.value1.value0 instanceof Data_Maybe_1.Just) {
              var submatches = (function () {
                  var $27 = Data_List_1.tail(catMaybes(Data_List_1.fromFoldable(Data_Foldable.foldableArray)($26.value0.value1.value0.value0)));
                  if ($27 instanceof Data_Maybe_1.Just) {
                      return $27.value0;
                  };
                  if ($27 instanceof Data_Maybe_1.Nothing) {
                      return Data_List_1.Nil.value;
                  };
                  throw new Error("Failed pattern match at Skald.Command line 62, column 30 - line 65, column 35: " + [ $27.constructor.name ]);
              })();
              if (submatches instanceof Data_List_1.Cons) {
                  var $30 = Skald_Place.object(submatches.value0)(Skald_World.currentPlace(v));
                  if ($30 instanceof Data_Maybe_1.Just) {
                      var $31 = Skald_Object.command($26.value0.value0)($30.value0);
                      if ($31 instanceof Data_Maybe_1.Just) {
                          return $31.value0;
                      };
                      if ($31 instanceof Data_Maybe_1.Nothing) {
                          return $26.value0.value1.value1(submatches);
                      };
                      throw new Error("Failed pattern match at Skald.Command line 74, column 29 - line 76, column 61: " + [ $31.constructor.name ]);
                  };
                  if ($30 instanceof Data_Maybe_1.Nothing) {
                      return $26.value0.value1.value1(submatches);
                  };
                  throw new Error("Failed pattern match at Skald.Command line 72, column 21 - line 77, column 53: " + [ $30.constructor.name ]);
              };
              if (submatches instanceof Data_List_1.Nil) {
                  return $26.value0.value1.value1(submatches);
              };
              throw new Error("Failed pattern match at Skald.Command line 70, column 13 - line 78, column 42: " + [ submatches.constructor.name ]);
          };
          return sayParserError("Unrecognized command.");
      });
  };
  exports["command"] = command;
  exports["insert"] = insert;
  exports["parse"] = parse;
})(PS["Skald.Command"] = PS["Skald.Command"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_Writer = PS["Control.Monad.Writer"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Skald_Command_1 = PS["Skald.Command"];
  var Skald_Command_1 = PS["Skald.Command"];
  var Skald_History_1 = PS["Skald.History"];
  var Skald_History_1 = PS["Skald.History"];
  var Skald_Internal = PS["Skald.Internal"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_World_1 = PS["Skald.World"];
  var Skald_World_1 = PS["Skald.World"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Function = PS["Data.Function"];        
  var waiting = Skald_Command_1.command("wait|z");
  var takingInventory = Skald_Command_1.command("(?:take )?inventory|i|inv");
  var taking = Skald_Command_1.command("(?:take|get)(?: (.+))?");
  var setCurrentPlace = function ($71) {
      return Control_Monad_State_Class.modify(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(Skald_World_1.setCurrentPlace($71));
  };
  var searching = Skald_Command_1.command("search(?: (.+))?");
  var removeFromInventory = function ($72) {
      return Control_Monad_State_Class.modify(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(Skald_World_1.removeFromInventory($72));
  };
  var looking = Skald_Command_1.command("(?:describe|examine|look(?: at)?|l|x|check|watch)(?: (.+))?");
  var list = function (z) {
      if (z instanceof Data_List.Nil) {
          return "";
      };
      if (z instanceof Data_List.Cons && z.value1 instanceof Data_List.Nil) {
          return z.value0;
      };
      if (z instanceof Data_List.Cons && (z.value1 instanceof Data_List.Cons && z.value1.value1 instanceof Data_List.Nil)) {
          return z.value0 + (", and " + z.value1.value0);
      };
      if (z instanceof Data_List.Cons) {
          return z.value0 + (", " + list(z.value1));
      };
      throw new Error("Failed pattern match at Skald.Action line 236, column 10 - line 240, column 35: " + [ z.constructor.name ]);
  };
  var heading = Skald_History_1.heading;
  var going = Skald_Command_1.command("(north(?:east|west)?|east|south(?:east|west)?|west|up|down|[neswud]|ne|nw|se|sw)|go(?: to)?(?: (.+))?");
  var formatError = Skald_History_1.error;
  var sayError = function ($73) {
      return Control_Monad_Writer_Class.tell(Control_Monad_Writer_Trans.monadWriterWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Skald_History_1.singleton(formatError($73)));
  };
  var format = Skald_History_1.message;
  var listInventory = function ($75) {
      return Skald_History_1.fromList(Data_Functor.map(Data_List.functorList)(function (x) {
          return format("* a " + x);
      })(Skald_World_1.inventoryNames($75)));
  };
  var say = function ($76) {
      return Control_Monad_Writer_Class.tell(Control_Monad_Writer_Trans.monadWriterWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Skald_History_1.singleton(format($76)));
  };
  var search = function (args) {
      if (args instanceof Data_List.Nil) {
          return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v) {
              var formatObject = function (names) {
                  return "You found " + (list(names) + " here.");
              };
              return say(formatObject(Skald_Place_1.objectNames(Skald_World_1.currentPlace(v))));
          });
      };
      return say("You found nothing.");
  };
  var wait = function (v) {
      return say("Time passed.");
  };
  var takeInventory = function (v) {
      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v1) {
          var message = (function () {
              var $22 = Skald_World_1.inventoryIsEmpty(v1);
              if ($22) {
                  return format("You had nothing.");
              };
              if (!$22) {
                  return format("You had:");
              };
              throw new Error("Failed pattern match at Skald.Action line 165, column 19 - line 168, column 5: " + [ $22.constructor.name ]);
          })();
          return Control_Monad_Writer_Class.tell(Control_Monad_Writer_Trans.monadWriterWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Skald_History_1.cons(message)(listInventory(v1)));
      });
  };
  var dropping = Skald_Command_1.command("drop(?: (.+))?");
  var destroyObject = function ($77) {
      return Control_Monad_State_Class.modify(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(Skald_World_1.removeObject($77));
  };
  var describePlace = function (place) {
      var html = Skald_History_1.cons(heading(Skald_Place_1.name(place)))(Skald_History_1.cons(format(Skald_Place_1.description(place)))(Data_Monoid.mempty(Skald_Internal.monoidHistory)));
      return Control_Monad_Writer_Class.tell(Control_Monad_Writer_Trans.monadWriterWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(html);
  };
  var enterPlace = function (place) {
      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(setCurrentPlace(place))(function () {
          return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(describePlace(place))(function () {
              return setCurrentPlace(Skald_Place_1.setVisited(true)(place));
          });
      });
  };
  var go = function (args) {
      var insteadGo = function (direction) {
          return go(new Data_List.Cons(direction, Data_List.Nil.value));
      };
      if (args instanceof Data_List.Cons && (args.value0 === "n" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("north");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "ne" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("northeast");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "e" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("east");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "se" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("southeast");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "s" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("south");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "sw" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("southwest");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "w" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("west");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "nw" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("northwest");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "u" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("up");
      };
      if (args instanceof Data_List.Cons && (args.value0 === "d" && args.value1 instanceof Data_List.Nil)) {
          return insteadGo("down");
      };
      if (args instanceof Data_List.Cons && args.value1 instanceof Data_List.Nil) {
          return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v) {
              var $45 = Skald_Place_1.exitName(args.value0)(Skald_World_1.currentPlace(v));
              if ($45 instanceof Data_Maybe.Just) {
                  return enterPlace(Skald_World_1.place($45.value0)(v));
              };
              if ($45 instanceof Data_Maybe.Nothing) {
                  return sayError("You could not go that way.");
              };
              throw new Error("Failed pattern match at Skald.Action line 120, column 9 - line 123, column 5: " + [ $45.constructor.name ]);
          });
      };
      return sayError("Go where?");
  };
  var describeObject = function ($78) {
      return say(Skald_Object_1.description($78));
  };
  var look = function (args) {
      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v) {
          var currentPlace = Skald_World_1.currentPlace(v);
          if (args instanceof Data_List.Nil) {
              return describePlace(currentPlace);
          };
          if (args instanceof Data_List.Cons) {
              var $51 = Skald_Place_1.object(args.value0)(currentPlace);
              if ($51 instanceof Data_Maybe.Just) {
                  return describeObject($51.value0);
              };
              if ($51 instanceof Data_Maybe.Nothing) {
                  var $53 = Skald_World_1.item(args.value0)(v);
                  if ($53 instanceof Data_Maybe.Just) {
                      return describeObject($53.value0);
                  };
                  if ($53 instanceof Data_Maybe.Nothing) {
                      return sayError("You could not see such a thing.");
                  };
                  throw new Error("Failed pattern match at Skald.Action line 83, column 24 - line 87, column 1: " + [ $53.constructor.name ]);
              };
              throw new Error("Failed pattern match at Skald.Action line 81, column 21 - line 87, column 1: " + [ $51.constructor.name ]);
          };
          throw new Error("Failed pattern match at Skald.Action line 79, column 5 - line 87, column 1: " + [ args.constructor.name ]);
      });
  };
  var debugging = Skald_Command_1.command("debug");
  var debug = function (v) {
      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v1) {
          return say(Skald_World_1.toString(v1));
      });
  };
  var createObject = function ($79) {
      return Control_Monad_State_Class.modify(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(Skald_World_1.addObject($79));
  };
  var drop = function (args) {
      if (args instanceof Data_List.Cons && args.value1 instanceof Data_List.Nil) {
          return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v) {
              var $60 = Skald_World_1.item(args.value0)(v);
              if ($60 instanceof Data_Maybe.Just) {
                  return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(removeFromInventory($60.value0))(function () {
                      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(createObject($60.value0))(function () {
                          return say("You drop the " + (args.value0 + "."));
                      });
                  });
              };
              if ($60 instanceof Data_Maybe.Nothing) {
                  return sayError("You did not have such a thing.");
              };
              throw new Error("Failed pattern match at Skald.Action line 151, column 9 - line 157, column 5: " + [ $60.constructor.name ]);
          });
      };
      return sayError("Drop what?");
  };
  var addToInventory = function ($80) {
      return Control_Monad_State_Class.modify(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(Skald_World_1.addToInventory($80));
  };
  var take = function (args) {
      if (args instanceof Data_List.Cons && args.value1 instanceof Data_List.Nil) {
          return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(Control_Monad_State_Class.get(Control_Monad_Writer_Trans.monadStateWriterT(Skald_Internal.monoidHistory)(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))))(function (v) {
              var $66 = Skald_Place_1.object(args.value0)(Skald_World_1.currentPlace(v));
              if ($66 instanceof Data_Maybe.Just) {
                  var $67 = Skald_Object_1.fixedInPlace($66.value0);
                  if ($67) {
                      return sayError("You could not take that.");
                  };
                  if (!$67) {
                      return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(addToInventory($66.value0))(function () {
                          return Control_Bind.bind(Control_Monad_Writer_Trans.bindWriterT(Skald_Internal.semigroupHistory)(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity)))(destroyObject($66.value0))(function () {
                              return say("You take the " + (args.value0 + "."));
                          });
                      });
                  };
                  throw new Error("Failed pattern match at Skald.Action line 135, column 27 - line 140, column 57: " + [ $67.constructor.name ]);
              };
              if ($66 instanceof Data_Maybe.Nothing) {
                  return sayError("You could not see such a thing.");
              };
              throw new Error("Failed pattern match at Skald.Action line 134, column 9 - line 142, column 5: " + [ $66.constructor.name ]);
          });
      };
      return sayError("Take what?");
  };
  var defaultMap = Data_Function.apply(Skald_Command_1.insert(looking)(look))(Data_Function.apply(Skald_Command_1.insert(searching)(search))(Data_Function.apply(Skald_Command_1.insert(going)(go))(Data_Function.apply(Skald_Command_1.insert(taking)(take))(Data_Function.apply(Skald_Command_1.insert(takingInventory)(takeInventory))(Data_Function.apply(Skald_Command_1.insert(dropping)(drop))(Data_Function.apply(Skald_Command_1.insert(waiting)(wait))(Skald_Command_1.insert(debugging)(debug)(Data_List.Nil.value))))))));
  var emptyWorld = Skald_World_1.setCommands(defaultMap)(Skald_World_1.empty);
  exports["createObject"] = createObject;
  exports["describeObject"] = describeObject;
  exports["describePlace"] = describePlace;
  exports["drop"] = drop;
  exports["dropping"] = dropping;
  exports["emptyWorld"] = emptyWorld;
  exports["enterPlace"] = enterPlace;
  exports["go"] = go;
  exports["going"] = going;
  exports["look"] = look;
  exports["looking"] = looking;
  exports["removeFromInventory"] = removeFromInventory;
  exports["say"] = say;
  exports["sayError"] = sayError;
  exports["search"] = search;
  exports["searching"] = searching;
  exports["take"] = take;
  exports["takeInventory"] = takeInventory;
  exports["taking"] = taking;
  exports["takingInventory"] = takingInventory;
  exports["wait"] = wait;
  exports["waiting"] = waiting;
})(PS["Skald.Action"] = PS["Skald.Action"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_StrMap = PS["Data.StrMap"];
  var Data_Tuple = PS["Data.Tuple"];
  var Skald_Direction = PS["Skald.Direction"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Object_1 = PS["Skald.Object"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_Internal = PS["Skald.Internal"];
  var Data_Function = PS["Data.Function"];        
  var withExits = function (exits$prime$prime) {
      return function (v) {
          var update = function (x) {
              return Data_Foldable.foldr(Data_Foldable.foldableArray)(function (v1) {
                  return Data_StrMap.insert(v1.value0)(v1.value1);
              })(x)(exits$prime$prime);
          };
          return new Skald_Internal.Place((function () {
              var $11 = {};
              for (var $12 in v.value0) {
                  if (v.value0.hasOwnProperty($12)) {
                      $11[$12] = v.value0[$12];
                  };
              };
              $11.exits = update(v.value0.exits);
              return $11;
          })());
      };
  };
  var withExit = function (direction) {
      return function (exitName$prime) {
          return function (v) {
              return new Skald_Internal.Place((function () {
                  var $18 = {};
                  for (var $19 in v.value0) {
                      if (v.value0.hasOwnProperty($19)) {
                          $18[$19] = v.value0[$19];
                      };
                  };
                  $18.exits = Data_StrMap.insert(direction)(exitName$prime)(v.value0.exits);
                  return $18;
              })());
          };
      };
  };
  var withDescription = function (description$prime) {
      return function (v) {
          return new Skald_Internal.Place((function () {
              var $24 = {};
              for (var $25 in v.value0) {
                  if (v.value0.hasOwnProperty($25)) {
                      $24[$25] = v.value0[$25];
                  };
              };
              $24.describer = Data_Function["const"](description$prime);
              return $24;
          })());
      };
  };
  var whenDescribing = function (describer$prime) {
      return function (v) {
          return new Skald_Internal.Place((function () {
              var $29 = {};
              for (var $30 in v.value0) {
                  if (v.value0.hasOwnProperty($30)) {
                      $29[$30] = v.value0[$30];
                  };
              };
              $29.describer = describer$prime;
              return $29;
          })());
      };
  };
  var to = Data_Tuple.Tuple.create;
  var containing = function (objects$prime$prime) {
      return function (v) {
          var update = function (x) {
              return Data_Foldable.foldr(Data_Foldable.foldableArray)(function (object$prime) {
                  return Data_StrMap.insert(Skald_Object_1.name(object$prime))(object$prime);
              })(x)(objects$prime$prime);
          };
          return new Skald_Internal.Place((function () {
              var $34 = {};
              for (var $35 in v.value0) {
                  if (v.value0.hasOwnProperty($35)) {
                      $34[$35] = v.value0[$35];
                  };
              };
              $34.objects = update(v.value0.objects);
              return $34;
          })());
      };
  };
  exports["containing"] = containing;
  exports["to"] = to;
  exports["whenDescribing"] = whenDescribing;
  exports["withDescription"] = withDescription;
  exports["withExit"] = withExit;
  exports["withExits"] = withExits;
})(PS["Skald.PlaceBuilder"] = PS["Skald.PlaceBuilder"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_StrMap = PS["Data.StrMap"];
  var Skald_Action = PS["Skald.Action"];
  var Skald_Command_1 = PS["Skald.Command"];
  var Skald_Command_1 = PS["Skald.Command"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_Place_1 = PS["Skald.Place"];
  var Skald_World_1 = PS["Skald.World"];
  var Skald_World_1 = PS["Skald.World"];
  var Data_Function = PS["Data.Function"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var Tale = (function () {
      function Tale(value0) {
          this.value0 = value0;
      };
      Tale.create = function (value0) {
          return new Tale(value0);
      };
      return Tale;
  })();
  var withPlaces = function (places) {
      return function (v) {
          var update = function (world) {
              return Data_Foldable.foldl(Data_Foldable.foldableArray)(function (places$prime) {
                  return function (place) {
                      return Data_StrMap.insert(Skald_Place_1.name(place))(place)(places$prime);
                  };
              })(world)(places);
          };
          var newWorld = Skald_World_1.updatePlaces(update)(v.value0.initialWorld);
          return new Tale((function () {
              var $17 = {};
              for (var $18 in v.value0) {
                  if (v.value0.hasOwnProperty($18)) {
                      $17[$18] = v.value0[$18];
                  };
              };
              $17.initialWorld = newWorld;
              return $17;
          })());
      };
  };
  var withPlace = function (place) {
      return function (v) {
          var update = Data_StrMap.insert(Skald_Place_1.name(place))(place);
          var newWorld = Skald_World_1.updatePlaces(update)(v.value0.initialWorld);
          return new Tale((function () {
              var $22 = {};
              for (var $23 in v.value0) {
                  if (v.value0.hasOwnProperty($23)) {
                      $22[$23] = v.value0[$23];
                  };
              };
              $22.initialWorld = newWorld;
              return $22;
          })());
      };
  };
  var title = function (v) {
      return v.value0.title;
  };
  var thatBeginsIn = function (place) {
      return function (v) {
          return Data_Function.apply(withPlace(place))(new Tale((function () {
              var $35 = {};
              for (var $36 in v.value0) {
                  if (v.value0.hasOwnProperty($36)) {
                      $35[$36] = v.value0[$36];
                  };
              };
              $35.initialWorld = Skald_World_1.setCurrentPlace(place)(v.value0.initialWorld);
              return $35;
          })()));
      };
  };
  var initialWorld = function (v) {
      return v.value0.initialWorld;
  };
  var by = function (name) {
      return function (v) {
          return new Tale((function () {
              var $44 = {};
              for (var $45 in v.value0) {
                  if (v.value0.hasOwnProperty($45)) {
                      $44[$45] = v.value0[$45];
                  };
              };
              $44.author = name;
              return $44;
          })());
      };
  };
  var author = function (v) {
      return v.value0.author;
  };
  var defaultPreamble = function (tale$prime) {
      return title(tale$prime) + ("\nby " + author(tale$prime));
  };
  var tale = function (title$prime) {
      return new Tale({
          title: title$prime, 
          author: "", 
          initialWorld: Skald_Action.emptyWorld, 
          preamble: defaultPreamble
      });
  };
  exports["Tale"] = Tale;
  exports["author"] = author;
  exports["by"] = by;
  exports["initialWorld"] = initialWorld;
  exports["tale"] = tale;
  exports["thatBeginsIn"] = thatBeginsIn;
  exports["title"] = title;
  exports["withPlace"] = withPlace;
  exports["withPlaces"] = withPlaces;
})(PS["Skald.Tale"] = PS["Skald.Tale"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Halogen.HTML.Events.Handler

  exports.preventDefaultImpl = function (e) {
    return function () {
      e.preventDefault();
    };
  };

  exports.stopPropagationImpl = function (e) {
    return function () {
      e.stopPropagation();
    };
  };

  exports.stopImmediatePropagationImpl = function (e) {
    return function () {
      e.stopImmediatePropagation();
    };
  };
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Halogen.HTML.Events.Handler"];
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Writer = PS["Control.Monad.Writer"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM = PS["DOM"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Function = PS["Data.Function"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var PreventDefault = (function () {
      function PreventDefault() {

      };
      PreventDefault.value = new PreventDefault();
      return PreventDefault;
  })();
  var StopPropagation = (function () {
      function StopPropagation() {

      };
      StopPropagation.value = new StopPropagation();
      return StopPropagation;
  })();
  var StopImmediatePropagation = (function () {
      function StopImmediatePropagation() {

      };
      StopImmediatePropagation.value = new StopImmediatePropagation();
      return StopImmediatePropagation;
  })();
  var EventHandler = function (x) {
      return x;
  };                                                                                                                                                                                                      
  var runEventHandler = function (dictMonad) {
      return function (dictMonadEff) {
          return function (e) {
              return function (v) {
                  var applyUpdate = function (v1) {
                      if (v1 instanceof PreventDefault) {
                          return $foreign.preventDefaultImpl(e);
                      };
                      if (v1 instanceof StopPropagation) {
                          return $foreign.stopPropagationImpl(e);
                      };
                      if (v1 instanceof StopImmediatePropagation) {
                          return $foreign.stopImmediatePropagationImpl(e);
                      };
                      throw new Error("Failed pattern match at Halogen.HTML.Events.Handler line 89, column 3 - line 89, column 63: " + [ v1.constructor.name ]);
                  };
                  var $13 = Control_Monad_Writer.runWriter(v);
                  return Data_Function.apply(Control_Monad_Eff_Class.liftEff(dictMonadEff))(Control_Apply.applySecond(Control_Monad_Eff.applyEff)(Data_Foldable.for_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)($13.value1)(applyUpdate))(Control_Applicative.pure(Control_Monad_Eff.applicativeEff)($13.value0)));
              };
          };
      };
  };                                                                                                                                                                                  
  var functorEventHandler = new Data_Functor.Functor(function (f) {
      return function (v) {
          return Data_Functor.map(Control_Monad_Writer_Trans.functorWriterT(Data_Identity.functorIdentity))(f)(v);
      };
  });
  var applyEventHandler = new Control_Apply.Apply(function () {
      return functorEventHandler;
  }, function (v) {
      return function (v1) {
          return Control_Apply.apply(Control_Monad_Writer_Trans.applyWriterT(Data_Semigroup.semigroupArray)(Data_Identity.applyIdentity))(v)(v1);
      };
  });
  var applicativeEventHandler = new Control_Applicative.Applicative(function () {
      return applyEventHandler;
  }, function ($23) {
      return EventHandler(Control_Applicative.pure(Control_Monad_Writer_Trans.applicativeWriterT(Data_Monoid.monoidArray)(Data_Identity.applicativeIdentity))($23));
  });
  exports["runEventHandler"] = runEventHandler;
  exports["functorEventHandler"] = functorEventHandler;
  exports["applyEventHandler"] = applyEventHandler;
  exports["applicativeEventHandler"] = applicativeEventHandler;
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Exists = PS["Data.Exists"];
  var Data_ExistsR = PS["Data.ExistsR"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Show = PS["Data.Show"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];        
  var TagName = function (x) {
      return x;
  };
  var PropName = function (x) {
      return x;
  };
  var EventName = function (x) {
      return x;
  };
  var HandlerF = (function () {
      function HandlerF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      HandlerF.create = function (value0) {
          return function (value1) {
              return new HandlerF(value0, value1);
          };
      };
      return HandlerF;
  })();
  var ClassName = function (x) {
      return x;
  };
  var AttrName = function (x) {
      return x;
  };
  var PropF = (function () {
      function PropF(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      PropF.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new PropF(value0, value1, value2);
              };
          };
      };
      return PropF;
  })();
  var Prop = (function () {
      function Prop(value0) {
          this.value0 = value0;
      };
      Prop.create = function (value0) {
          return new Prop(value0);
      };
      return Prop;
  })();
  var Attr = (function () {
      function Attr(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      Attr.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new Attr(value0, value1, value2);
              };
          };
      };
      return Attr;
  })();
  var Key = (function () {
      function Key(value0) {
          this.value0 = value0;
      };
      Key.create = function (value0) {
          return new Key(value0);
      };
      return Key;
  })();
  var Handler = (function () {
      function Handler(value0) {
          this.value0 = value0;
      };
      Handler.create = function (value0) {
          return new Handler(value0);
      };
      return Handler;
  })();
  var Ref = (function () {
      function Ref(value0) {
          this.value0 = value0;
      };
      Ref.create = function (value0) {
          return new Ref(value0);
      };
      return Ref;
  })();
  var Text = (function () {
      function Text(value0) {
          this.value0 = value0;
      };
      Text.create = function (value0) {
          return new Text(value0);
      };
      return Text;
  })();
  var Element = (function () {
      function Element(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Element.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Element(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Element;
  })();
  var Slot = (function () {
      function Slot(value0) {
          this.value0 = value0;
      };
      Slot.create = function (value0) {
          return new Slot(value0);
      };
      return Slot;
  })();
  var IsProp = function (toPropString) {
      this.toPropString = toPropString;
  };
  var toPropString = function (dict) {
      return dict.toPropString;
  };
  var tagName = TagName;
  var stringIsProp = new IsProp(function (v) {
      return function (v1) {
          return function (s) {
              return s;
          };
      };
  });
  var runTagName = function (v) {
      return v;
  };
  var runPropName = function (v) {
      return v;
  };
  var runNamespace = function (v) {
      return v;
  };
  var runEventName = function (v) {
      return v;
  };
  var runClassName = function (v) {
      return v;
  };
  var runAttrName = function (v) {
      return v;
  };
  var propName = PropName;
  var prop = function (dictIsProp) {
      return function (name) {
          return function (attr) {
              return function (v) {
                  return new Prop(Data_Exists.mkExists(new PropF(name, v, Data_Functor.map(Data_Maybe.functorMaybe)(Data_Function.flip(Data_Tuple.Tuple.create)(toPropString(dictIsProp)))(attr))));
              };
          };
      };
  }; 
  var handler = function (name) {
      return function (k) {
          return new Handler(Data_ExistsR.mkExistsR(new HandlerF(name, k)));
      };
  };
  var eventName = EventName;
  var element = Element.create(Data_Maybe.Nothing.value);
  var className = ClassName;                                                     
  var attrName = AttrName;
  exports["Text"] = Text;
  exports["Element"] = Element;
  exports["Slot"] = Slot;
  exports["HandlerF"] = HandlerF;
  exports["Prop"] = Prop;
  exports["Attr"] = Attr;
  exports["Key"] = Key;
  exports["Handler"] = Handler;
  exports["Ref"] = Ref;
  exports["PropF"] = PropF;
  exports["IsProp"] = IsProp;
  exports["attrName"] = attrName;
  exports["className"] = className;
  exports["element"] = element;
  exports["eventName"] = eventName;
  exports["handler"] = handler;
  exports["prop"] = prop;
  exports["propName"] = propName;
  exports["runAttrName"] = runAttrName;
  exports["runClassName"] = runClassName;
  exports["runEventName"] = runEventName;
  exports["runNamespace"] = runNamespace;
  exports["runPropName"] = runPropName;
  exports["runTagName"] = runTagName;
  exports["tagName"] = tagName;
  exports["toPropString"] = toPropString;
  exports["stringIsProp"] = stringIsProp;
})(PS["Halogen.HTML.Core"] = PS["Halogen.HTML.Core"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine_Aff = PS["Control.Coroutine.Aff"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Const = PS["Data.Const"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Maybe = PS["Data.Maybe"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Data_Function = PS["Data.Function"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var runEventSource = function (v) {
      return v;
  };
  exports["runEventSource"] = runEventSource;
})(PS["Halogen.Query.EventSource"] = PS["Halogen.Query.EventSource"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Applicative = PS["Control.Applicative"];        
  var Get = (function () {
      function Get(value0) {
          this.value0 = value0;
      };
      Get.create = function (value0) {
          return new Get(value0);
      };
      return Get;
  })();
  var Modify = (function () {
      function Modify(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Modify.create = function (value0) {
          return function (value1) {
              return new Modify(value0, value1);
          };
      };
      return Modify;
  })();
  var stateN = function (dictMonad) {
      return function (dictMonadState) {
          return function (v) {
              if (v instanceof Get) {
                  return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(Control_Monad_State_Class.get(dictMonadState))(function ($22) {
                      return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(v.value0($22));
                  });
              };
              if (v instanceof Modify) {
                  return Data_Functor.voidLeft(((dictMonad["__superclass_Control.Bind.Bind_1"]())["__superclass_Control.Apply.Apply_0"]())["__superclass_Data.Functor.Functor_0"]())(Control_Monad_State_Class.modify(dictMonadState)(v.value0))(v.value1);
              };
              throw new Error("Failed pattern match at Halogen.Query.StateF line 33, column 1 - line 33, column 40: " + [ v.constructor.name ]);
          };
      };
  };
  var functorStateF = new Data_Functor.Functor(function (f) {
      return function (v) {
          if (v instanceof Get) {
              return new Get(function ($24) {
                  return f(v.value0($24));
              });
          };
          if (v instanceof Modify) {
              return new Modify(v.value0, f(v.value1));
          };
          throw new Error("Failed pattern match at Halogen.Query.StateF line 21, column 3 - line 21, column 32: " + [ f.constructor.name, v.constructor.name ]);
      };
  });
  exports["Get"] = Get;
  exports["Modify"] = Modify;
  exports["stateN"] = stateN;
  exports["functorStateF"] = functorStateF;
})(PS["Halogen.Query.StateF"] = PS["Halogen.Query.StateF"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Monad_Aff_Free = PS["Control.Monad.Aff.Free"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Maybe = PS["Data.Maybe"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];        
  var Pending = (function () {
      function Pending() {

      };
      Pending.value = new Pending();
      return Pending;
  })();
  var StateHF = (function () {
      function StateHF(value0) {
          this.value0 = value0;
      };
      StateHF.create = function (value0) {
          return new StateHF(value0);
      };
      return StateHF;
  })();
  var SubscribeHF = (function () {
      function SubscribeHF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      SubscribeHF.create = function (value0) {
          return function (value1) {
              return new SubscribeHF(value0, value1);
          };
      };
      return SubscribeHF;
  })();
  var QueryHF = (function () {
      function QueryHF(value0) {
          this.value0 = value0;
      };
      QueryHF.create = function (value0) {
          return new QueryHF(value0);
      };
      return QueryHF;
  })();
  var RenderHF = (function () {
      function RenderHF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      RenderHF.create = function (value0) {
          return function (value1) {
              return new RenderHF(value0, value1);
          };
      };
      return RenderHF;
  })();
  var RenderPendingHF = (function () {
      function RenderPendingHF(value0) {
          this.value0 = value0;
      };
      RenderPendingHF.create = function (value0) {
          return new RenderPendingHF(value0);
      };
      return RenderPendingHF;
  })();
  var HaltHF = (function () {
      function HaltHF() {

      };
      HaltHF.value = new HaltHF();
      return HaltHF;
  })();
  var functorHalogenF = function (dictFunctor) {
      return new Data_Functor.Functor(function (f) {
          return function (h) {
              if (h instanceof StateHF) {
                  return new StateHF(Data_Functor.map(Halogen_Query_StateF.functorStateF)(f)(h.value0));
              };
              if (h instanceof SubscribeHF) {
                  return new SubscribeHF(h.value0, f(h.value1));
              };
              if (h instanceof QueryHF) {
                  return new QueryHF(Data_Functor.map(dictFunctor)(f)(h.value0));
              };
              if (h instanceof RenderHF) {
                  return new RenderHF(h.value0, f(h.value1));
              };
              if (h instanceof RenderPendingHF) {
                  return new RenderPendingHF(Data_Functor.map(Data_Functor.functorFn)(f)(h.value0));
              };
              if (h instanceof HaltHF) {
                  return HaltHF.value;
              };
              throw new Error("Failed pattern match at Halogen.Query.HalogenF line 37, column 5 - line 43, column 23: " + [ h.constructor.name ]);
          };
      });
  };
  var affableHalogenF = function (dictAffable) {
      return new Control_Monad_Aff_Free.Affable(function ($34) {
          return QueryHF.create(Control_Monad_Aff_Free.fromAff(dictAffable)($34));
      });
  };
  exports["StateHF"] = StateHF;
  exports["SubscribeHF"] = SubscribeHF;
  exports["QueryHF"] = QueryHF;
  exports["RenderHF"] = RenderHF;
  exports["RenderPendingHF"] = RenderPendingHF;
  exports["HaltHF"] = HaltHF;
  exports["Pending"] = Pending;
  exports["functorHalogenF"] = functorHalogenF;
  exports["affableHalogenF"] = affableHalogenF;
})(PS["Halogen.Query.HalogenF"] = PS["Halogen.Query.HalogenF"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff_Free = PS["Control.Monad.Aff.Free"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Category = PS["Control.Category"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Function = PS["Data.Function"];
  var modify = function (f) {
      return Control_Monad_Free.liftF(new Halogen_Query_HalogenF.StateHF(new Halogen_Query_StateF.Modify(f, Data_Unit.unit)));
  };                                                               
  var action = function (act) {
      return act(Data_Unit.unit);
  };
  exports["action"] = action;
  exports["modify"] = modify;
})(PS["Halogen.Query"] = PS["Halogen.Query"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];                                          
  var onSubmit = Halogen_HTML_Core.handler(Halogen_HTML_Core.eventName("submit"));
  var input_ = function (f) {
      return function (v) {
          return Data_Function.apply(Control_Applicative.pure(Halogen_HTML_Events_Handler.applicativeEventHandler))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_Query.action(f)));
      };
  };
  var input = function (f) {
      return function (x) {
          return Data_Function.apply(Control_Applicative.pure(Halogen_HTML_Events_Handler.applicativeEventHandler))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_Query.action(f(x))));
      };
  };
  exports["input"] = input;
  exports["input_"] = input_;
  exports["onSubmit"] = onSubmit;
})(PS["Halogen.HTML.Events"] = PS["Halogen.HTML.Events"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Data_Maybe = PS["Data.Maybe"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];        
  var addForeignPropHandler = function (dictIsForeign) {
      return function (key) {
          return function (prop) {
              return function (f) {
                  return Halogen_HTML_Core.handler(Halogen_HTML_Core.eventName(key))(function ($2) {
                      return Data_Either.either(Data_Function.apply(Data_Function["const"])(Control_Applicative.pure(Halogen_HTML_Events_Handler.applicativeEventHandler)(Data_Maybe.Nothing.value)))(f)(Data_Foreign_Class.readProp(dictIsForeign)(Data_Foreign_Index.indexString)(prop)(Data_Foreign.toForeign((function (v) {
                          return v.target;
                      })($2))));
                  });
              };
          };
      };
  };                                                                                               
  var onValueInput = addForeignPropHandler(Data_Foreign_Class.stringIsForeign)("input")("value");
  exports["onValueInput"] = onValueInput;
})(PS["Halogen.HTML.Events.Forms"] = PS["Halogen.HTML.Events.Forms"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Data_Function = PS["Data.Function"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Functor = PS["Data.Functor"];
  var value = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("value"))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_HTML_Core.attrName("value")));
  var type_ = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("type"))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_HTML_Core.attrName("type")));
  var placeholder = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("placeholder"))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_HTML_Core.attrName("placeholder")));
  var name = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("name"))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_HTML_Core.attrName("name")));
  var id_ = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("id"))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_HTML_Core.attrName("id")));
  var class_ = function ($9) {
      return Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("className"))(Data_Function.apply(Data_Maybe.Just.create)(Halogen_HTML_Core.attrName("class")))(Halogen_HTML_Core.runClassName($9));
  };
  exports["class_"] = class_;
  exports["id_"] = id_;
  exports["name"] = name;
  exports["placeholder"] = placeholder;
  exports["type_"] = type_;
  exports["value"] = value;
})(PS["Halogen.HTML.Properties"] = PS["Halogen.HTML.Properties"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Array = PS["Data.Array"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties_1 = PS["Halogen.HTML.Properties"];
  var Halogen_HTML_Properties_1 = PS["Halogen.HTML.Properties"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var InputButton = (function () {
      function InputButton() {

      };
      InputButton.value = new InputButton();
      return InputButton;
  })();
  var InputCheckbox = (function () {
      function InputCheckbox() {

      };
      InputCheckbox.value = new InputCheckbox();
      return InputCheckbox;
  })();
  var InputColor = (function () {
      function InputColor() {

      };
      InputColor.value = new InputColor();
      return InputColor;
  })();
  var InputDate = (function () {
      function InputDate() {

      };
      InputDate.value = new InputDate();
      return InputDate;
  })();
  var InputDatetime = (function () {
      function InputDatetime() {

      };
      InputDatetime.value = new InputDatetime();
      return InputDatetime;
  })();
  var InputDatetimeLocal = (function () {
      function InputDatetimeLocal() {

      };
      InputDatetimeLocal.value = new InputDatetimeLocal();
      return InputDatetimeLocal;
  })();
  var InputEmail = (function () {
      function InputEmail() {

      };
      InputEmail.value = new InputEmail();
      return InputEmail;
  })();
  var InputFile = (function () {
      function InputFile() {

      };
      InputFile.value = new InputFile();
      return InputFile;
  })();
  var InputHidden = (function () {
      function InputHidden() {

      };
      InputHidden.value = new InputHidden();
      return InputHidden;
  })();
  var InputImage = (function () {
      function InputImage() {

      };
      InputImage.value = new InputImage();
      return InputImage;
  })();
  var InputMonth = (function () {
      function InputMonth() {

      };
      InputMonth.value = new InputMonth();
      return InputMonth;
  })();
  var InputNumber = (function () {
      function InputNumber() {

      };
      InputNumber.value = new InputNumber();
      return InputNumber;
  })();
  var InputPassword = (function () {
      function InputPassword() {

      };
      InputPassword.value = new InputPassword();
      return InputPassword;
  })();
  var InputRadio = (function () {
      function InputRadio() {

      };
      InputRadio.value = new InputRadio();
      return InputRadio;
  })();
  var InputRange = (function () {
      function InputRange() {

      };
      InputRange.value = new InputRange();
      return InputRange;
  })();
  var InputReset = (function () {
      function InputReset() {

      };
      InputReset.value = new InputReset();
      return InputReset;
  })();
  var InputSearch = (function () {
      function InputSearch() {

      };
      InputSearch.value = new InputSearch();
      return InputSearch;
  })();
  var InputSubmit = (function () {
      function InputSubmit() {

      };
      InputSubmit.value = new InputSubmit();
      return InputSubmit;
  })();
  var InputTel = (function () {
      function InputTel() {

      };
      InputTel.value = new InputTel();
      return InputTel;
  })();
  var InputText = (function () {
      function InputText() {

      };
      InputText.value = new InputText();
      return InputText;
  })();
  var InputTime = (function () {
      function InputTime() {

      };
      InputTime.value = new InputTime();
      return InputTime;
  })();
  var InputUrl = (function () {
      function InputUrl() {

      };
      InputUrl.value = new InputUrl();
      return InputUrl;
  })();
  var InputWeek = (function () {
      function InputWeek() {

      };
      InputWeek.value = new InputWeek();
      return InputWeek;
  })();
  var renderInputType = function (ty) {
      if (ty instanceof InputButton) {
          return "button";
      };
      if (ty instanceof InputCheckbox) {
          return "checkbox";
      };
      if (ty instanceof InputColor) {
          return "color";
      };
      if (ty instanceof InputDate) {
          return "date";
      };
      if (ty instanceof InputDatetime) {
          return "datetime";
      };
      if (ty instanceof InputDatetimeLocal) {
          return "datetime-local";
      };
      if (ty instanceof InputEmail) {
          return "email";
      };
      if (ty instanceof InputFile) {
          return "file";
      };
      if (ty instanceof InputHidden) {
          return "hidden";
      };
      if (ty instanceof InputImage) {
          return "image";
      };
      if (ty instanceof InputMonth) {
          return "month";
      };
      if (ty instanceof InputNumber) {
          return "number";
      };
      if (ty instanceof InputPassword) {
          return "password";
      };
      if (ty instanceof InputRadio) {
          return "radio";
      };
      if (ty instanceof InputRange) {
          return "range";
      };
      if (ty instanceof InputReset) {
          return "reset";
      };
      if (ty instanceof InputSearch) {
          return "search";
      };
      if (ty instanceof InputSubmit) {
          return "submit";
      };
      if (ty instanceof InputTel) {
          return "tel";
      };
      if (ty instanceof InputText) {
          return "text";
      };
      if (ty instanceof InputTime) {
          return "time";
      };
      if (ty instanceof InputUrl) {
          return "url";
      };
      if (ty instanceof InputWeek) {
          return "week";
      };
      throw new Error("Failed pattern match at Halogen.HTML.Properties.Indexed line 184, column 3 - line 209, column 1: " + [ ty.constructor.name ]);
  };
  var refine = Unsafe_Coerce.unsafeCoerce;            
  var value = refine(Halogen_HTML_Properties_1.value);      
  var placeholder = refine(Halogen_HTML_Properties_1.placeholder);
  var name = refine(Halogen_HTML_Properties_1.name);
  var inputType = function ($20) {
      return refine(Halogen_HTML_Properties_1.type_)(renderInputType($20));
  };
  var id_ = refine(Halogen_HTML_Properties_1.id_);        
  var class_ = refine(Halogen_HTML_Properties_1.class_);
  exports["InputButton"] = InputButton;
  exports["InputCheckbox"] = InputCheckbox;
  exports["InputColor"] = InputColor;
  exports["InputDate"] = InputDate;
  exports["InputDatetime"] = InputDatetime;
  exports["InputDatetimeLocal"] = InputDatetimeLocal;
  exports["InputEmail"] = InputEmail;
  exports["InputFile"] = InputFile;
  exports["InputHidden"] = InputHidden;
  exports["InputImage"] = InputImage;
  exports["InputMonth"] = InputMonth;
  exports["InputNumber"] = InputNumber;
  exports["InputPassword"] = InputPassword;
  exports["InputRadio"] = InputRadio;
  exports["InputRange"] = InputRange;
  exports["InputReset"] = InputReset;
  exports["InputSearch"] = InputSearch;
  exports["InputSubmit"] = InputSubmit;
  exports["InputTel"] = InputTel;
  exports["InputText"] = InputText;
  exports["InputTime"] = InputTime;
  exports["InputUrl"] = InputUrl;
  exports["InputWeek"] = InputWeek;
  exports["class_"] = class_;
  exports["id_"] = id_;
  exports["inputType"] = inputType;
  exports["name"] = name;
  exports["placeholder"] = placeholder;
  exports["value"] = value;
})(PS["Halogen.HTML.Properties.Indexed"] = PS["Halogen.HTML.Properties.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Data_Maybe = PS["Data.Maybe"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Events_1 = PS["Halogen.HTML.Events"];
  var Halogen_HTML_Events_1 = PS["Halogen.HTML.Events"];
  var Halogen_HTML_Events_Forms = PS["Halogen.HTML.Events.Forms"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];        
  var refine$prime = Unsafe_Coerce.unsafeCoerce;
  var refine = Unsafe_Coerce.unsafeCoerce;
  var onValueInput = refine$prime(Halogen_HTML_Events_Forms.onValueInput);
  var onSubmit = refine(Halogen_HTML_Events_1.onSubmit);
  exports["onSubmit"] = onSubmit;
  exports["onValueInput"] = onValueInput;
})(PS["Halogen.HTML.Events.Indexed"] = PS["Halogen.HTML.Events.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Either = PS["Data.Either"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Foreign = PS["Data.Foreign"];
  var DOM = PS["DOM"];
  var DOM_Event_EventTarget = PS["DOM.Event.EventTarget"];
  var DOM_HTML_Event_EventTypes = PS["DOM.HTML.Event.EventTypes"];
  var DOM_HTML = PS["DOM.HTML"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var DOM_HTML_Window = PS["DOM.HTML.Window"];
  var DOM_Node_ParentNode = PS["DOM.Node.ParentNode"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Unit = PS["Data.Unit"];        
  var selectElement = function (query) {
      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff))(Data_Functor.map(Control_Monad_Eff.functorEff)(Data_Nullable.toMaybe)(Control_Bind.bindFlipped(Control_Monad_Eff.bindEff)(Control_Bind.composeKleisliFlipped(Control_Monad_Eff.bindEff)(function ($8) {
          return DOM_Node_ParentNode.querySelector(query)(DOM_HTML_Types.htmlDocumentToParentNode($8));
      })(DOM_HTML_Window.document))(DOM_HTML.window))))(function (v) {
          return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)((function () {
              if (v instanceof Data_Maybe.Nothing) {
                  return Data_Maybe.Nothing.value;
              };
              if (v instanceof Data_Maybe.Just) {
                  return Data_Function.apply(Data_Either.either(Data_Function["const"](Data_Maybe.Nothing.value))(Data_Maybe.Just.create))(DOM_HTML_Types.readHTMLElement(Data_Foreign.toForeign(v.value0)));
              };
              throw new Error("Failed pattern match at Halogen.Util line 54, column 3 - line 56, column 76: " + [ v.constructor.name ]);
          })());
      });
  };
  var runHalogenAff = function ($9) {
      return Data_Functor["void"](Control_Monad_Eff.functorEff)(Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Data_Function["const"](Control_Applicative.pure(Control_Monad_Eff.applicativeEff)(Data_Unit.unit)))($9));
  };
  var awaitLoad = Control_Monad_Aff.makeAff(function (v) {
      return function (callback) {
          return Data_Function.apply(Control_Monad_Eff_Class.liftEff(Control_Monad_Eff_Class.monadEffEff))(function __do() {
              var $10 = DOM_HTML.window();
              return DOM_Event_EventTarget.addEventListener(DOM_HTML_Event_EventTypes.load)(DOM_Event_EventTarget.eventListener(function (v1) {
                  return callback(Data_Unit.unit);
              }))(false)(DOM_HTML_Types.windowToEventTarget($10))();
          });
      };
  });
  var awaitBody = Control_Bind.bind(Control_Monad_Aff.bindAff)(awaitLoad)(function () {
      return Control_Bind.bindFlipped(Control_Monad_Aff.bindAff)(Data_Maybe.maybe(Control_Monad_Error_Class.throwError(Control_Monad_Aff.monadErrorAff)(Control_Monad_Eff_Exception.error("Could not find body")))(Control_Applicative.pure(Control_Monad_Aff.applicativeAff)))(selectElement("body"));
  });
  exports["awaitBody"] = awaitBody;
  exports["awaitLoad"] = awaitLoad;
  exports["runHalogenAff"] = runHalogenAff;
  exports["selectElement"] = selectElement;
})(PS["Halogen.Util"] = PS["Halogen.Util"] || {});
(function(exports) {
  // Copyright 2016 Ian D. Bollinger
  //
  // Licensed under the MIT license <LICENSE or
  // http://opensource.org/licenses/MIT>. This file may not be copied, modified,
  // or distributed except according to those terms.

  "use strict";

  exports.focus = function () {
    document.getElementById("input").focus();
  };
})(PS["Skald.Focus"] = PS["Skald.Focus"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Skald.Focus"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["focus"] = $foreign.focus;
})(PS["Skald.Focus"] = PS["Skald.Focus"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Monoid = PS["Data.Monoid"];
  var Skald_Action = PS["Skald.Action"];
  var Skald_History = PS["Skald.History"];
  var Skald_World = PS["Skald.World"];
  var Skald_Internal = PS["Skald.Internal"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var Model = (function () {
      function Model(value0) {
          this.value0 = value0;
      };
      Model.create = function (value0) {
          return new Model(value0);
      };
      return Model;
  })();
  var world = function (v) {
      return v.value0.world;
  };
  var setWorld = function (newWorld) {
      return function (v) {
          return new Model((function () {
              var $11 = {};
              for (var $12 in v.value0) {
                  if (v.value0.hasOwnProperty($12)) {
                      $11[$12] = v.value0[$12];
                  };
              };
              $11.world = newWorld;
              return $11;
          })());
      };
  };
  var setInputField = function (newInputField) {
      return function (v) {
          return new Model((function () {
              var $16 = {};
              for (var $17 in v.value0) {
                  if (v.value0.hasOwnProperty($17)) {
                      $16[$17] = v.value0[$17];
                  };
              };
              $16.inputField = newInputField;
              return $16;
          })());
      };
  };
  var setHistory = function (newHistory) {
      return function (v) {
          return new Model((function () {
              var $21 = {};
              for (var $22 in v.value0) {
                  if (v.value0.hasOwnProperty($22)) {
                      $21[$22] = v.value0[$22];
                  };
              };
              $21.history = newHistory;
              return $21;
          })());
      };
  };
  var inputField = function (v) {
      return v.value0.inputField;
  };
  var history = function (v) {
      return v.value0.history;
  };
  var empty = new Model({
      history: Data_Monoid.mempty(Skald_Internal.monoidHistory), 
      world: Skald_Action.emptyWorld, 
      inputField: ""
  });
  var appendHistory = function (entries) {
      return function (v) {
          return new Model((function () {
              var $30 = {};
              for (var $31 in v.value0) {
                  if (v.value0.hasOwnProperty($31)) {
                      $30[$31] = v.value0[$31];
                  };
              };
              $30.history = Data_Semigroup.append(Skald_Internal.semigroupHistory)(v.value0.history)(entries);
              return $30;
          })());
      };
  };
  exports["appendHistory"] = appendHistory;
  exports["empty"] = empty;
  exports["history"] = history;
  exports["inputField"] = inputField;
  exports["setHistory"] = setHistory;
  exports["setInputField"] = setInputField;
  exports["setWorld"] = setWorld;
  exports["world"] = world;
})(PS["Skald.Model"] = PS["Skald.Model"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var p = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("p"))(xs);
  };                   
  var input = function (props) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("input"))(props)([  ]);
  };                 
  var h1 = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("h1"))(xs);
  };
  var h1_ = h1([  ]);      
  var form = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("form"))(xs);
  };                 
  var div = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("div"))(xs);
  };
  var div_ = div([  ]);
  exports["div"] = div;
  exports["div_"] = div_;
  exports["form"] = form;
  exports["h1"] = h1;
  exports["h1_"] = h1_;
  exports["input"] = input;
  exports["p"] = p;
})(PS["Halogen.HTML.Elements"] = PS["Halogen.HTML.Elements"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_HTML_Elements_1 = PS["Halogen.HTML.Elements"];
  var Halogen_HTML_Elements_1 = PS["Halogen.HTML.Elements"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                              
  var p = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements_1.p);    
  var input = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements_1.input);
  var form = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements_1.form);
  exports["form"] = form;
  exports["input"] = input;
  exports["p"] = p;
})(PS["Halogen.HTML.Elements.Indexed"] = PS["Halogen.HTML.Elements.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var PostRender = (function () {
      function PostRender(value0) {
          this.value0 = value0;
      };
      PostRender.create = function (value0) {
          return new PostRender(value0);
      };
      return PostRender;
  })();
  var Finalized = (function () {
      function Finalized(value0) {
          this.value0 = value0;
      };
      Finalized.create = function (value0) {
          return new Finalized(value0);
      };
      return Finalized;
  })();
  var FinalizedF = (function () {
      function FinalizedF(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      FinalizedF.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new FinalizedF(value0, value1, value2);
              };
          };
      };
      return FinalizedF;
  })();
  var runFinalized = function (k) {
      return function (f) {
          var $6 = Unsafe_Coerce.unsafeCoerce(f);
          return k($6.value0)($6.value1)($6.value2);
      };
  };
  var finalized = function (e) {
      return function (s) {
          return function (i) {
              return Unsafe_Coerce.unsafeCoerce(new FinalizedF(e, s, i));
          };
      };
  };
  exports["PostRender"] = PostRender;
  exports["Finalized"] = Finalized;
  exports["finalized"] = finalized;
  exports["runFinalized"] = runFinalized;
})(PS["Halogen.Component.Hook"] = PS["Halogen.Component.Hook"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Lazy = PS["Data.Lazy"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Category = PS["Control.Category"];        
  var runTree = function (k) {
      return function (t) {
          var $5 = Unsafe_Coerce.unsafeCoerce(t);
          return k($5);
      };
  };
  var mkTree$prime = Unsafe_Coerce.unsafeCoerce;
  exports["mkTree'"] = mkTree$prime;
  exports["runTree"] = runTree;
})(PS["Halogen.Component.Tree"] = PS["Halogen.Component.Tree"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_ST = PS["Control.Monad.ST"];
  var Data_Array = PS["Data.Array"];
  var Data_Array_ST = PS["Data.Array.ST"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Lazy = PS["Data.Lazy"];
  var Data_List = PS["Data.List"];
  var Data_Map = PS["Data.Map"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Halogen_Component_ChildPath = PS["Halogen.Component.ChildPath"];
  var Halogen_Component_Hook = PS["Halogen.Component.Hook"];
  var Halogen_Component_Tree = PS["Halogen.Component.Tree"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Function = PS["Data.Function"];
  var Control_Category = PS["Control.Category"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Monoid = PS["Data.Monoid"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var renderComponent = function (v) {
      return v.render;
  };
  var queryComponent = function (v) {
      return v["eval"];
  };
  var lifecycleComponent = function (spec) {
      var renderTree = function (html) {
          return Halogen_Component_Tree["mkTree'"]({
              slot: Data_Unit.unit, 
              html: Data_Lazy.defer(function (v) {
                  return Unsafe_Coerce.unsafeCoerce(html);
              }), 
              eq: function (v) {
                  return function (v1) {
                      return false;
                  };
              }, 
              thunk: false
          });
      };
      return {
          render: function (s) {
              return {
                  state: s, 
                  hooks: [  ], 
                  tree: renderTree(spec.render(s))
              };
          }, 
          "eval": spec["eval"], 
          initializer: spec.initializer, 
          finalizers: function (s) {
              return Data_Maybe.maybe([  ])(function (i) {
                  return [ Halogen_Component_Hook.finalized(spec["eval"])(s)(i) ];
              })(spec.finalizer);
          }
      };
  };
  var initializeComponent = function (v) {
      return v.initializer;
  };
  var component = function (spec) {
      return lifecycleComponent({
          render: spec.render, 
          "eval": spec["eval"], 
          initializer: Data_Maybe.Nothing.value, 
          finalizer: Data_Maybe.Nothing.value
      });
  };
  exports["component"] = component;
  exports["initializeComponent"] = initializeComponent;
  exports["lifecycleComponent"] = lifecycleComponent;
  exports["queryComponent"] = queryComponent;
  exports["renderComponent"] = renderComponent;
})(PS["Halogen.Component"] = PS["Halogen.Component"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Component_ChildPath = PS["Halogen.Component.ChildPath"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Data_Functor = PS["Data.Functor"];        
  var text = Halogen_HTML_Core.Text.create;
  exports["text"] = text;
})(PS["Halogen.HTML"] = PS["Halogen.HTML"] || {});
(function(exports) {
  /* global exports, require */
  "use strict";
  var vcreateElement =require("virtual-dom/create-element");
  var vdiff =require("virtual-dom/diff");
  var vpatch =require("virtual-dom/patch");
  var VText =require("virtual-dom/vnode/vtext");
  var VirtualNode =require("virtual-dom/vnode/vnode");
  var SoftSetHook =require("virtual-dom/virtual-hyperscript/hooks/soft-set-hook"); 

  // jshint maxparams: 2
  exports.prop = function (key, value) {
    var props = {};
    props[key] = value;
    return props;
  };

  // jshint maxparams: 2
  exports.attr = function (key, value) {
    var props = { attributes: {} };
    props.attributes[key] = value;
    return props;
  };

  function HandlerHook (key, f) {
    this.key = key;
    this.callback = function (e) {
      f(e)();
    };
  }

  HandlerHook.prototype = {
    hook: function (node) {
      node.addEventListener(this.key, this.callback);
    },
    unhook: function (node) {
      node.removeEventListener(this.key, this.callback);
    }
  };

  // jshint maxparams: 2
  exports.handlerProp = function (key, f) {
    var props = {};
    props["halogen-hook-" + key] = new HandlerHook(key, f);
    return props;
  };

  exports.refPropImpl = function (nothing) {
    return function (just) {

      var ifHookFn = function (init) {
        // jshint maxparams: 3
        return function (node, prop, diff) {
          // jshint validthis: true
          if (typeof diff === "undefined") {
            this.f(init ? just(node) : nothing)();
          }
        };
      };

      // jshint maxparams: 1
      function RefHook (f) {
        this.f = f;
      }

      RefHook.prototype = {
        hook: ifHookFn(true),
        unhook: ifHookFn(false)
      };

      return function (f) {
        return { "halogen-ref": new RefHook(f) };
      };
    };
  };

  // jshint maxparams: 3
  function HalogenWidget (tree, eq, render) {
    this.tree = tree;
    this.eq = eq;
    this.render = render;
    this.vdom = null;
    this.el = null;
  }

  HalogenWidget.prototype = {
    type: "Widget",
    init: function () {
      this.vdom = this.render(this.tree);
      this.el = vcreateElement(this.vdom);
      return this.el;
    },
    update: function (prev, node) {
      if (!prev.tree || !this.eq(prev.tree.slot)(this.tree.slot)) {
        return this.init();
      }
      if (this.tree.thunk) {
        this.vdom = prev.vdom;
        this.el = prev.el;
      } else {
        this.vdom = this.render(this.tree);
        this.el = vpatch(node, vdiff(prev.vdom, this.vdom));
      }
    }
  };

  exports.widget = function (tree) {
    return function (eq) {
      return function (render) {
        return new HalogenWidget(tree, eq, render);
      };
    };
  };

  exports.concatProps = function () {
    // jshint maxparams: 2
    var hOP = Object.prototype.hasOwnProperty;
    var copy = function (props, result) {
      for (var key in props) {
        if (hOP.call(props, key)) {
          if (key === "attributes") {
            var attrs = props[key];
            var resultAttrs = result[key] || (result[key] = {});
            for (var attr in attrs) {
              if (hOP.call(attrs, attr)) {
                resultAttrs[attr] = attrs[attr];
              }
            }
          } else {
            result[key] = props[key];
          }
        }
      }
      return result;
    };
    return function (p1, p2) {
      return copy(p2, copy(p1, {}));
    };
  }();

  exports.emptyProps = {};

  exports.createElement = function (vtree) {
    return vcreateElement(vtree);
  };

  exports.diff = function (vtree1) {
    return function (vtree2) {
      return vdiff(vtree1, vtree2);
    };
  };

  exports.patch = function (p) {
    return function (node) {
      return function () {
        return vpatch(node, p);
      };
    };
  };

  exports.vtext = function (s) {
    return new VText(s);
  };

  exports.vnode = function (namespace) {
    return function (name) {
      return function (key) {
        return function (props) {
          return function (children) {
            if (name === "input" && props.value !== undefined) {
              props.value = new SoftSetHook(props.value);
            }
            return new VirtualNode(name, props, children, key, namespace);
          };
        };
      };
    };
  };
})(PS["Halogen.Internal.VirtualDOM"] = PS["Halogen.Internal.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var $foreign = PS["Halogen.Internal.VirtualDOM"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_Component_Tree = PS["Halogen.Component.Tree"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var semigroupProps = new Data_Semigroup.Semigroup(Data_Function_Uncurried.runFn2($foreign.concatProps));
  var refProp = $foreign.refPropImpl(Data_Maybe.Nothing.value)(Data_Maybe.Just.create);
  var monoidProps = new Data_Monoid.Monoid(function () {
      return semigroupProps;
  }, $foreign.emptyProps);
  exports["refProp"] = refProp;
  exports["semigroupProps"] = semigroupProps;
  exports["monoidProps"] = monoidProps;
  exports["attr"] = $foreign.attr;
  exports["createElement"] = $foreign.createElement;
  exports["diff"] = $foreign.diff;
  exports["handlerProp"] = $foreign.handlerProp;
  exports["patch"] = $foreign.patch;
  exports["prop"] = $foreign.prop;
  exports["vnode"] = $foreign.vnode;
  exports["vtext"] = $foreign.vtext;
  exports["widget"] = $foreign.widget;
})(PS["Halogen.Internal.VirtualDOM"] = PS["Halogen.Internal.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Exists = PS["Data.Exists"];
  var Data_ExistsR = PS["Data.ExistsR"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_Lazy = PS["Data.Lazy"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Nullable = PS["Data.Nullable"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Halogen_Component_Tree = PS["Halogen.Component.Tree"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_Internal_VirtualDOM = PS["Halogen.Internal.VirtualDOM"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Bind = PS["Control.Bind"];        
  var handleAff = function ($40) {
      return Data_Functor["void"](Control_Monad_Eff.functorEff)(Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Data_Function["const"](Control_Applicative.pure(Control_Monad_Eff.applicativeEff)(Data_Unit.unit)))($40));
  };
  var renderProp = function (v) {
      return function (v1) {
          if (v1 instanceof Halogen_HTML_Core.Prop) {
              return Data_Exists.runExists(function (v2) {
                  return Data_Function_Uncurried.runFn2(Halogen_Internal_VirtualDOM.prop)(Halogen_HTML_Core.runPropName(v2.value0))(v2.value1);
              })(v1.value0);
          };
          if (v1 instanceof Halogen_HTML_Core.Attr) {
              var attrName = Data_Maybe.maybe("")(function (ns$prime) {
                  return Halogen_HTML_Core.runNamespace(ns$prime) + ":";
              })(v1.value0) + Halogen_HTML_Core.runAttrName(v1.value1);
              return Data_Function_Uncurried.runFn2(Halogen_Internal_VirtualDOM.attr)(attrName)(v1.value2);
          };
          if (v1 instanceof Halogen_HTML_Core.Handler) {
              return Data_ExistsR.runExistsR(function (v2) {
                  return Data_Function_Uncurried.runFn2(Halogen_Internal_VirtualDOM.handlerProp)(Halogen_HTML_Core.runEventName(v2.value0))(function (ev) {
                      return Data_Function.apply(handleAff)(Control_Bind.bind(Control_Monad_Aff.bindAff)(Halogen_HTML_Events_Handler.runEventHandler(Control_Monad_Aff.monadAff)(Control_Monad_Aff.monadEffAff)(ev)(v2.value1(ev)))(Data_Maybe.maybe(Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(Data_Unit.unit))(v)));
                  });
              })(v1.value0);
          };
          if (v1 instanceof Halogen_HTML_Core.Ref) {
              return Halogen_Internal_VirtualDOM.refProp(function ($41) {
                  return handleAff(v(v1.value0($41)));
              });
          };
          return Data_Monoid.mempty(Halogen_Internal_VirtualDOM.monoidProps);
      };
  };
  var findKey = function (v) {
      return function (v1) {
          if (v1 instanceof Halogen_HTML_Core.Key) {
              return new Data_Maybe.Just(v1.value0);
          };
          return v;
      };
  };
  var renderTree = function (f) {
      return Halogen_Component_Tree.runTree(function (tree) {
          var go = function (v) {
              if (v instanceof Halogen_HTML_Core.Text) {
                  return Halogen_Internal_VirtualDOM.vtext(v.value0);
              };
              if (v instanceof Halogen_HTML_Core.Slot) {
                  return Halogen_Internal_VirtualDOM.widget(v.value0)(tree.eq)(renderTree(f));
              };
              if (v instanceof Halogen_HTML_Core.Element) {
                  var tag = Halogen_HTML_Core.runTagName(v.value1);
                  var ns$prime = Data_Function.apply(Data_Nullable.toNullable)(Data_Functor.map(Data_Maybe.functorMaybe)(Halogen_HTML_Core.runNamespace)(v.value0));
                  var key = Data_Function.apply(Data_Nullable.toNullable)(Data_Foldable.foldl(Data_Foldable.foldableArray)(findKey)(Data_Maybe.Nothing.value)(v.value2));
                  return Halogen_Internal_VirtualDOM.vnode(ns$prime)(tag)(key)(Data_Foldable.foldMap(Data_Foldable.foldableArray)(Halogen_Internal_VirtualDOM.monoidProps)(renderProp(f))(v.value2))(Data_Functor.map(Data_Functor.functorArray)(go)(v.value3));
              };
              throw new Error("Failed pattern match at Halogen.HTML.Renderer.VirtualDOM line 49, column 5 - line 56, column 28: " + [ v.constructor.name ]);
          };
          return go(Data_Lazy.force(tree.html));
      });
  };
  exports["renderTree"] = renderTree;
})(PS["Halogen.HTML.Renderer.VirtualDOM"] = PS["Halogen.HTML.Renderer.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine = PS["Control.Coroutine"];
  var Control_Coroutine_Stalling_1 = PS["Control.Coroutine.Stalling"];
  var Control_Coroutine_Stalling_1 = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Either = PS["Data.Either"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var DOM_Node_Node = PS["DOM.Node.Node"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Component_Hook = PS["Halogen.Component.Hook"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Halogen_HTML_Renderer_VirtualDOM = PS["Halogen.HTML.Renderer.VirtualDOM"];
  var Halogen_Internal_VirtualDOM = PS["Halogen.Internal.VirtualDOM"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Data_Function = PS["Data.Function"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Functor = PS["Data.Functor"];        
  var onInitializers = function (dictFoldable) {
      return function (f) {
          var go = function (v) {
              return function (as) {
                  if (v instanceof Halogen_Component_Hook.PostRender) {
                      return new Data_List.Cons(f(v.value0), as);
                  };
                  return as;
              };
          };
          return Data_Foldable.foldr(dictFoldable)(go)(Data_List.Nil.value);
      };
  };
  var onFinalizers = function (dictFoldable) {
      return function (f) {
          var go = function (v) {
              return function (as) {
                  if (v instanceof Halogen_Component_Hook.Finalized) {
                      return new Data_List.Cons(f(v.value0), as);
                  };
                  return as;
              };
          };
          return Data_Foldable.foldr(dictFoldable)(go)(Data_List.Nil.value);
      };
  };
  var runUI = function (c) {
      return function (s) {
          return function (element) {
              var driver$prime = function (e) {
                  return function (s1) {
                      return function (i) {
                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar["makeVar'"](s1))(function (v) {
                              return Data_Function.flip(Control_Monad_Free.runFreeM(Halogen_Query_HalogenF.functorHalogenF(Control_Monad_Aff.functorAff))(Control_Monad_Aff.monadRecAff))(e(i))(function (h) {
                                  if (h instanceof Halogen_Query_HalogenF.StateHF) {
                                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(v))(function (v1) {
                                          var $29 = Control_Monad_State.runState(Halogen_Query_StateF.stateN(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity))(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(h.value0))(v1);
                                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(v)($29.value1))(function () {
                                              return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)($29.value0);
                                          });
                                      });
                                  };
                                  if (h instanceof Halogen_Query_HalogenF.SubscribeHF) {
                                      return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(h.value1);
                                  };
                                  if (h instanceof Halogen_Query_HalogenF.RenderHF) {
                                      return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(h.value1);
                                  };
                                  if (h instanceof Halogen_Query_HalogenF.RenderPendingHF) {
                                      return Data_Function.apply(Control_Applicative.pure(Control_Monad_Aff.applicativeAff))(h.value0(Data_Maybe.Nothing.value));
                                  };
                                  if (h instanceof Halogen_Query_HalogenF.QueryHF) {
                                      return h.value0;
                                  };
                                  if (h instanceof Halogen_Query_HalogenF.HaltHF) {
                                      return Control_Plus.empty(Control_Monad_Aff.plusAff);
                                  };
                                  throw new Error("Failed pattern match at Halogen.Driver line 145, column 7 - line 156, column 24: " + [ h.constructor.name ]);
                              });
                          });
                      };
                  };
              };
              var render = function (ref) {
                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (v) {
                      if (v.renderPaused) {
                          return Data_Function.apply(Control_Monad_Aff_AVar.putVar(ref))((function () {
                              var $41 = {};
                              for (var $42 in v) {
                                  if (v.hasOwnProperty($42)) {
                                      $41[$42] = v[$42];
                                  };
                              };
                              $41.renderPending = true;
                              return $41;
                          })());
                      };
                      if (!v.renderPaused) {
                          var rc = Halogen_Component.renderComponent(c)(v.state);
                          var vtree$prime = Halogen_HTML_Renderer_VirtualDOM.renderTree(driver(ref))(rc.tree);
                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff))(Halogen_Internal_VirtualDOM.patch(Halogen_Internal_VirtualDOM.diff(v.vtree)(vtree$prime))(v.node)))(function (v1) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(ref)({
                                  node: v1, 
                                  vtree: vtree$prime, 
                                  state: rc.state, 
                                  renderPending: false, 
                                  renderPaused: true
                              }))(function () {
                                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff.forkAll(Data_List.foldableList))(onFinalizers(Data_Foldable.foldableArray)(Halogen_Component_Hook.runFinalized(driver$prime))(rc.hooks)))(function () {
                                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff.forkAll(Data_List.foldableList))(onInitializers(Data_Foldable.foldableArray)(driver(ref))(rc.hooks)))(function () {
                                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.modifyVar(function (v2) {
                                              var $44 = {};
                                              for (var $45 in v2) {
                                                  if (v2.hasOwnProperty($45)) {
                                                      $44[$45] = v2[$45];
                                                  };
                                              };
                                              $44.renderPaused = false;
                                              return $44;
                                          })(ref))(function () {
                                              return flushRender(ref);
                                          });
                                      });
                                  });
                              });
                          });
                      };
                      throw new Error("Failed pattern match at Halogen.Driver line 161, column 5 - line 177, column 24: " + [ v.renderPaused.constructor.name ]);
                  });
              };
              var flushRender = Control_Monad_Rec_Class.tailRecM(Control_Monad_Aff.monadRecAff)(function (ref) {
                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (v) {
                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(ref)(v))(function () {
                          var $47 = !v.renderPending;
                          if ($47) {
                              return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(new Data_Either.Right(Data_Unit.unit));
                          };
                          if (!$47) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(render(ref))(function () {
                                  return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(new Data_Either.Left(ref));
                              });
                          };
                          throw new Error("Failed pattern match at Halogen.Driver line 183, column 5 - line 187, column 24: " + [ $47.constructor.name ]);
                      });
                  });
              });
              var $$eval = function (ref) {
                  return function (rpRef) {
                      return function (h) {
                          if (h instanceof Halogen_Query_HalogenF.StateHF) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (v) {
                                  if (h.value0 instanceof Halogen_Query_StateF.Get) {
                                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(ref)(v))(function () {
                                          return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(h.value0.value0(v.state));
                                      });
                                  };
                                  if (h.value0 instanceof Halogen_Query_StateF.Modify) {
                                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(rpRef))(function (v1) {
                                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff_AVar.putVar(ref))((function () {
                                              var $53 = {};
                                              for (var $54 in v) {
                                                  if (v.hasOwnProperty($54)) {
                                                      $53[$54] = v[$54];
                                                  };
                                              };
                                              $53.state = h.value0.value0(v.state);
                                              return $53;
                                          })()))(function () {
                                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff_AVar.putVar(rpRef))(new Data_Maybe.Just(Halogen_Query_HalogenF.Pending.value)))(function () {
                                                  return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(h.value0.value1);
                                              });
                                          });
                                      });
                                  };
                                  throw new Error("Failed pattern match at Halogen.Driver line 107, column 9 - line 115, column 22: " + [ h.value0.constructor.name ]);
                              });
                          };
                          if (h instanceof Halogen_Query_HalogenF.SubscribeHF) {
                              var producer = Halogen_Query_EventSource.runEventSource(h.value0);
                              var consumer = Control_Monad_Rec_Class.forever(Control_Monad_Free_Trans.monadRecFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(Control_Bind.bindFlipped(Control_Monad_Free_Trans.bindFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(function ($72) {
                                  return Control_Monad_Trans.lift(Control_Monad_Free_Trans.monadTransFreeT(Control_Coroutine.functorAwait))(Control_Monad_Aff.monadAff)(driver(ref)($72));
                              })(Control_Coroutine["await"](Control_Monad_Aff.monadAff)));
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff.forkAff)(Control_Coroutine_Stalling_1.runStallingProcess(Control_Monad_Aff.monadRecAff)(Control_Coroutine_Stalling_1.fuse(Control_Monad_Aff.monadRecAff)(producer)(consumer))))(function () {
                                  return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(h.value1);
                              });
                          };
                          if (h instanceof Halogen_Query_HalogenF.RenderHF) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.modifyVar(Data_Function["const"](h.value0))(rpRef))(function () {
                                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Applicative.when(Control_Monad_Aff.applicativeAff)(Data_Maybe.isNothing(h.value0)))(render(ref)))(function () {
                                      return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(h.value1);
                                  });
                              });
                          };
                          if (h instanceof Halogen_Query_HalogenF.RenderPendingHF) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(rpRef))(function (v) {
                                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(rpRef)(v))(function () {
                                      return Data_Function.apply(Control_Applicative.pure(Control_Monad_Aff.applicativeAff))(h.value0(v));
                                  });
                              });
                          };
                          if (h instanceof Halogen_Query_HalogenF.QueryHF) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(rpRef))(function (v) {
                                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Applicative.when(Control_Monad_Aff.applicativeAff)(Data_Maybe.isJust(v)))(render(ref)))(function () {
                                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(rpRef)(Data_Maybe.Nothing.value))(function () {
                                          return h.value0;
                                      });
                                  });
                              });
                          };
                          if (h instanceof Halogen_Query_HalogenF.HaltHF) {
                              return Control_Plus.empty(Control_Monad_Aff.plusAff);
                          };
                          throw new Error("Failed pattern match at Halogen.Driver line 104, column 5 - line 134, column 22: " + [ h.constructor.name ]);
                      };
                  };
              };
              var driver = function (ref) {
                  return function (q) {
                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar["makeVar'"](Data_Maybe.Nothing.value))(function (v) {
                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Free.runFreeM(Halogen_Query_HalogenF.functorHalogenF(Control_Monad_Aff.functorAff))(Control_Monad_Aff.monadRecAff)($$eval(ref)(v))(Halogen_Component.queryComponent(c)(q)))(function (v1) {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(v))(function (v2) {
                                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Applicative.when(Control_Monad_Aff.applicativeAff)(Data_Maybe.isJust(v2)))(render(ref)))(function () {
                                      return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(v1);
                                  });
                              });
                          });
                      });
                  };
              };
              return Data_Functor.map(Control_Monad_Aff.functorAff)(function (v) {
                  return v.driver;
              })(Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.makeVar)(function (v) {
                  var rc = Halogen_Component.renderComponent(c)(s);
                  var dr = driver(v);
                  var vtree = Halogen_HTML_Renderer_VirtualDOM.renderTree(dr)(rc.tree);
                  var node = Halogen_Internal_VirtualDOM.createElement(vtree);
                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(v)({
                      node: node, 
                      vtree: vtree, 
                      state: rc.state, 
                      renderPending: false, 
                      renderPaused: true
                  }))(function () {
                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff))(DOM_Node_Node.appendChild(DOM_HTML_Types.htmlElementToNode(node))(DOM_HTML_Types.htmlElementToNode(element))))(function () {
                          return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff.forkAll(Data_List.foldableList))(onInitializers(Data_Foldable.foldableArray)(dr)(rc.hooks)))(function () {
                              return Control_Bind.bind(Control_Monad_Aff.bindAff)(Data_Function.apply(Control_Monad_Aff.forkAff)(Data_Maybe.maybe(Control_Applicative.pure(Control_Monad_Aff.applicativeAff)(Data_Unit.unit))(dr)(Halogen_Component.initializeComponent(c))))(function () {
                                  return Control_Bind.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.modifyVar(function (v1) {
                                      var $70 = {};
                                      for (var $71 in v1) {
                                          if (v1.hasOwnProperty($71)) {
                                              $70[$71] = v1[$71];
                                          };
                                      };
                                      $70.renderPaused = false;
                                      return $70;
                                  })(v))(function () {
                                      return Control_Bind.bind(Control_Monad_Aff.bindAff)(flushRender(v))(function () {
                                          return Control_Applicative.pure(Control_Monad_Aff.applicativeAff)({
                                              driver: dr
                                          });
                                      });
                                  });
                              });
                          });
                      });
                  });
              }));
          };
      };
  };
  exports["runUI"] = runUI;
})(PS["Halogen.Driver"] = PS["Halogen.Driver"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_Free = PS["Control.Monad.Aff.Free"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Array = PS["Data.Array"];
  var Data_List = PS["Data.List"];
  var Data_Tuple_1 = PS["Data.Tuple"];
  var Data_Tuple_1 = PS["Data.Tuple"];
  var Halogen = PS["Halogen"];
  var Halogen_HTML_Events_Indexed = PS["Halogen.HTML.Events.Indexed"];
  var Halogen_HTML_Indexed = PS["Halogen.HTML.Indexed"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_Util = PS["Halogen.Util"];
  var Skald_Action = PS["Skald.Action"];
  var Skald_Command = PS["Skald.Command"];
  var Skald_History_1 = PS["Skald.History"];
  var Skald_History_1 = PS["Skald.History"];
  var Skald_Internal = PS["Skald.Internal"];
  var Skald_Focus = PS["Skald.Focus"];
  var Skald_Model_1 = PS["Skald.Model"];
  var Skald_Model_1 = PS["Skald.Model"];
  var Skald_Tale_1 = PS["Skald.Tale"];
  var Skald_Tale_1 = PS["Skald.Tale"];
  var Skald_World = PS["Skald.World"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Function = PS["Data.Function"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Elements_Indexed = PS["Halogen.HTML.Elements.Indexed"];
  var Halogen_HTML = PS["Halogen.HTML"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Functor = PS["Data.Functor"];
  var Halogen_HTML_Events = PS["Halogen.HTML.Events"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Halogen_Query = PS["Halogen.Query"];
  var Control_Applicative = PS["Control.Applicative"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Driver = PS["Halogen.Driver"];        
  var UpdateDescription = (function () {
      function UpdateDescription(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      UpdateDescription.create = function (value0) {
          return function (value1) {
              return new UpdateDescription(value0, value1);
          };
      };
      return UpdateDescription;
  })();
  var Submit = (function () {
      function Submit(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Submit.create = function (value0) {
          return function (value1) {
              return new Submit(value0, value1);
          };
      };
      return Submit;
  })();
  var update = function (field) {
      return function (model) {
          var $1 = Control_Monad_State.runState(Control_Monad_Writer_Trans.execWriterT(Control_Monad_State_Trans.functorStateT(Data_Identity.functorIdentity))(Skald_Command.parse(field)))(Skald_Model_1.world(model));
          return Data_Function.apply(Skald_Model_1.setWorld($1.value1))(Data_Function.apply(Skald_Model_1.appendHistory(Skald_History_1.cons(Skald_History_1.echo(field))($1.value0)))(model));
      };
  };
  var startUp = function (tale) {
      var world = Skald_Tale_1.initialWorld(tale);
      var onStartUp = Skald_Action.enterPlace(Skald_World.currentPlace(world));
      var $4 = Control_Monad_State.runState(Control_Monad_Writer_Trans.execWriterT(Control_Monad_State_Trans.functorStateT(Data_Identity.functorIdentity))(onStartUp))(world);
      return Data_Function.apply(Skald_Model_1.setWorld($4.value1))(Data_Function.apply(Skald_Model_1.setHistory($4.value0))(Skald_Model_1.empty));
  };
  var renderHistoricalEntry = function (entry) {
      var classAndString = (function () {
          if (entry instanceof Skald_Internal.Message) {
              return new Data_Tuple_1.Tuple("message", entry.value0);
          };
          if (entry instanceof Skald_Internal.Echo) {
              return new Data_Tuple_1.Tuple("echo", entry.value0);
          };
          if (entry instanceof Skald_Internal.Heading) {
              return new Data_Tuple_1.Tuple("heading", entry.value0);
          };
          if (entry instanceof Skald_Internal["Error"]) {
              return new Data_Tuple_1.Tuple("error", entry.value0);
          };
          throw new Error("Failed pattern match at Skald.App line 92, column 26 - line 96, column 48: " + [ entry.constructor.name ]);
      })();
      var attributes = [ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className(Data_Tuple_1.fst(classAndString))) ];
      return Halogen_HTML_Elements_Indexed.p(attributes)([ Halogen_HTML.text(Data_Tuple_1.snd(classAndString)) ]);
  };
  var renderHistory = function ($18) {
      return Data_Array.fromFoldable(Data_List.foldableList)(Data_Functor.map(Data_List.functorList)(renderHistoricalEntry)(Skald_History_1.toList($18)));
  };
  var ui = function (tale) {
      var render = function (model) {
          var onSubmit = Halogen_HTML_Events_Indexed.onSubmit(Halogen_HTML_Events.input_(Submit.create(Skald_Model_1.inputField(model))));
          var input = Halogen_HTML_Elements_Indexed.input([ Halogen_HTML_Properties_Indexed.inputType(Halogen_HTML_Properties_Indexed.InputText.value), Halogen_HTML_Properties_Indexed.placeholder("Enter command"), Halogen_HTML_Properties_Indexed.id_("input"), Halogen_HTML_Events_Indexed.onValueInput(Halogen_HTML_Events.input(UpdateDescription.create)) ]);
          var history = renderHistory(Skald_Model_1.history(model));
          var heading = Halogen_HTML_Elements.h1_([ Halogen_HTML.text(Skald_Tale_1.title(tale)) ]);
          var form = Halogen_HTML_Elements_Indexed.form([ onSubmit ])([ input ]);
          return Halogen_HTML_Elements.div_(Data_Semigroup.append(Data_Semigroup.semigroupArray)([ heading ])(Data_Semigroup.append(Data_Semigroup.semigroupArray)(history)([ form ])));
      };
      var $$eval = function (query) {
          if (query instanceof UpdateDescription) {
              return Control_Bind.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Skald_Model_1.setInputField(query.value0)))(function () {
                  return Control_Applicative.pure(Control_Monad_Free.freeApplicative)(query.value1);
              });
          };
          if (query instanceof Submit) {
              return Control_Bind.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(update(query.value0)))(function () {
                  return Control_Bind.bind(Control_Monad_Free.freeBind)(Control_Monad_Aff_Free.fromEff(Control_Monad_Aff_Free.affableFree(Halogen_Query_HalogenF.affableHalogenF(Control_Monad_Aff_Free.affableAff)))(Skald_Focus.focus))(function () {
                      return Control_Applicative.pure(Control_Monad_Free.freeApplicative)(query.value1);
                  });
              });
          };
          throw new Error("Failed pattern match at Skald.App line 73, column 22 - line 80, column 26: " + [ query.constructor.name ]);
      };
      return Halogen_Component.component({
          render: render, 
          "eval": $$eval
      });
  };
  var run = function (tale) {
      return Halogen_Util.runHalogenAff(Control_Bind.bind(Control_Monad_Aff.bindAff)(Halogen_Util.awaitBody)(function (v) {
          return Halogen_Driver.runUI(ui(tale))(startUp(tale))(v);
      }));
  };
  exports["run"] = run;
})(PS["Skald.App"] = PS["Skald.App"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Skald = PS["Skald"];
  var Skald_Object = PS["Skald.Object"];
  var Data_Function = PS["Data.Function"];
  var Skald_Action = PS["Skald.Action"];
  var Skald_Place = PS["Skald.Place"];
  var Skald_PlaceBuilder = PS["Skald.PlaceBuilder"];
  var Skald_Direction = PS["Skald.Direction"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Skald_Tale = PS["Skald.Tale"];
  var Skald_App = PS["Skald.App"];        
  var waterline = Skald_Object.scenery("waterline")("The water had been much higher in the past.");
  var tirungaTree = Skald_Object.scenery("tir\xf9nga tree")("The builders of the castle must have purposely built the inner ward around the enormous tree. Perhaps it would remain when the walls of Akkonai had been ground to dust by rain and wind.");
  var tables = Skald_Object.scenery("tables")("You wondered if this hall had ever been full.");
  var stalactites = Skald_Object.scenery("stalactites")("Bone-white protuberances hung from the cave\u2019s ceiling.");                                                         
  var spiralStaircase = Skald_Object.scenery("spiral staircase")("Running along the stairs was a low wall, above which sat a series of arches that held up the span of stairs overhead.");
  var sacksOfGrain = Skald_Object.scenery("sacks of grain")("The sacks were empty and scattered about carelessly.");
  var roots = Skald_Object.scenery("roots")("The roots of the tir\xf9nga could not be made out in the dense fog.");
  var rodentDroppings = Skald_Object.scenery("rodent droppings")("You wrinkled your nose.");
  var poolOfWater = Data_Function.applyFlipped(Skald_Object.scenery("pool of water")("you suspected a spring fed this pool."))(Skald_Object.insteadOf(Skald_Action.taking)(Skald_Action.say("you lacked a container to carry water.")));
  var outerWardCourtyard = Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("outer ward courtyard"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.north)("gatehouse") ])))(Skald_PlaceBuilder.withDescription("A yawning chasm sundered the outer ward. The gate to the inner ward was to the north."));
  var libraryShelves = Skald_Object.scenery("library shelves")("The shelves were bare and blanketed with dust. Not even a scrap of parchment remained. This was the work of the Academy.");
  var leaves = Data_Function.applyFlipped(Skald_Object.scenery("leaves")("The tir\xf9nga was prized for its blood-red leaves; it was often used as an ornamental plant."))(Skald_Object.insteadOf(Skald_Action.taking)(Skald_Action.say("The leaves were too far above to take.")));
  var larderShelves = Skald_Object.scenery("larder shelves")("The shelves were empty of everything but dust cobwebs.");
  var knife = Skald_Object.object("knife")("The tapered blade was thoroughly coated with rust; the knife\u2019s handle, however, was intact.");
  var kitchen = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("kitchen"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.east)("great hall"), Skald_PlaceBuilder.to(Skald_Direction.north)("larder") ])))(Skald_PlaceBuilder.withDescription("The larder was to the north. The great hall was to the east.")))(Skald_PlaceBuilder.containing([ knife ]));
  var hole = Skald_Object.scenery("hole")("You could not make out what was on the other side.");
  var well = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("well"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.east)("cavern spring"), Skald_PlaceBuilder.to(Skald_Direction.up)("northern inner ward courtyard") ])))(Skald_PlaceBuilder.withDescription("You found yourself at the bottom of a dry well. A spiral staircase wound around the well\u2019s interior. A hole in the east side of the well lead to the spring that once supplied it.")))(Skald_PlaceBuilder.containing([ spiralStaircase, hole ]));
  var gatehouse = Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("gatehouse"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.north)("southern inner ward courtyard"), Skald_PlaceBuilder.to(Skald_Direction.south)("outer ward courtyard") ])))(Skald_PlaceBuilder.withDescription("The gatehouse separated the inner ward (to the north) from the outer ward (to the south)."));
  var galleryWalls = Skald_Object.scenery("gallery walls")("you imagined the walls of the gallery once held portraits of the many masters of Akkonai.");
  var fog = Skald_Object.scenery("fog")("A thin layer of dense fog covered the majority of the courtyard of the inner ward.");
  var northernInnerWardCourtyard = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("northern inner ward courtyard"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.down)("well"), Skald_PlaceBuilder.to(Skald_Direction.north)("keep approach"), Skald_PlaceBuilder.to(Skald_Direction.south)("southern inner ward courtyard") ])))(Skald_PlaceBuilder.whenDescribing(function (x) {
      return "Stairs spiraled around a seemingly bottomless hole in " + ((function () {
          var $0 = Skald_Place.unvisited(x);
          if ($0) {
              return "what must be ";
          };
          if (!$0) {
              return "";
          };
          throw new Error("Failed pattern match at Example line 132, column 13 - line 132, column 56: " + [ $0.constructor.name ]);
      })() + ("the inner ward of Akkonai." + ((function () {
          var $1 = Skald_Place.unvisited(x);
          if ($1) {
              return " you exhaled\u2014both relieved and fatigued.";
          };
          if (!$1) {
              return "";
          };
          throw new Error("Failed pattern match at Example line 134, column 13 - line 135, column 20: " + [ $1.constructor.name ]);
      })() + " A tir\xf9nga grew from the center of the ward, its roots hidden beneath a blanket of fog. Stairs ran north to the keep.")));
  })))(Skald_PlaceBuilder.containing([ fog, tirungaTree, roots, leaves ]));
  var southernInnerWardCourtyard = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("southern inner ward courtyard"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.north)("northern inner ward courtyard"), Skald_PlaceBuilder.to(Skald_Direction.east)("gallery"), Skald_PlaceBuilder.to(Skald_Direction.west)("great hall"), Skald_PlaceBuilder.to(Skald_Direction.south)("gatehouse") ])))(Skald_PlaceBuilder.withDescription("Fog covered the courtyard of the inner ward. A massive tir\xf9nga punctured the center of the ward, spreading its canopy of crimson, spear-shaped leaves far overhead. The path to the keep lead north. There were structures to the east and west. To the south was the inner ward gate.")))(Skald_PlaceBuilder.containing([ fog, tirungaTree, roots, leaves ]));
  var fireplaces = Skald_Object.scenery("fireplaces")("None of the fireplaces remained functional.");
  var doorway = Skald_Object.scenery("doorway")("You could not make out what was on the other side.");
  var dais = Skald_Object.scenery("dais")("The dais was rotting.");
  var greatHall = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("great hall"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.east)("southern inner ward courtyard"), Skald_PlaceBuilder.to(Skald_Direction.west)("kitchen") ])))(Skald_PlaceBuilder.withDescription("A hall that could once seat hundreds was reduced to a pit of detritus. Great tables were crushed beneath collapsing plaster and stonework. The dais, waterlogged and rotten, sagged in the middle. Surrounding the room were three huge fireplaces, though their flues were likely choked with rubble. A small doorway to the west lead to a kitchen. To the east was the courtyard of the inner ward.")))(Skald_PlaceBuilder.containing([ dais, tables, fireplaces, doorway ]));
  var corbels = Skald_Object.scenery("corbels")("Between the arch-supporting corbels were machicolations; you imagined eyes watching from them.");
  var keepApproach = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("keep approach"))(Skald_PlaceBuilder.withExit(Skald_Direction.south)("northern inner ward courtyard")))(Skald_PlaceBuilder.withDescription("An enormous stairway lead up the craggy motte to the keep. It, clad in black marble, was crowned with corbels depicting various impish creatures. The rest of the inner ward was to the south.")))(Skald_PlaceBuilder.containing([ corbels, fog, tirungaTree, roots, leaves ]));
  var cobwebs = Skald_Object.scenery("cobwebs")("Cobwebs decorated the ceiling of the larder and cascaded down its bare shelves.");
  var larder = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("larder"))(Skald_PlaceBuilder.withExit("south")("kitchen")))(Skald_PlaceBuilder.withDescription("The larder was bare save for a pile of torn sacks of grain. Rodent droppings were apparent everywhere. The kitchen was to the south.")))(Skald_PlaceBuilder.containing([ rodentDroppings, cobwebs, larderShelves, sacksOfGrain ]));
  var cavernSpringDescription = "Stalactites glistened over a pool of water. Not far below them, a waterline marked the cave walls above you\u2019s head. There was an aperture in the wall to the west. A tunnel lead to the south.";
  var cavernInterior = Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("cavern interior"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.south)("cavern entrance"), Skald_PlaceBuilder.to(Skald_Direction.north)("cavern spring") ])))(Skald_PlaceBuilder.withDescription("A sliver of light filtered through the southern entrance, illuminating a thin streak across the cavern floor. The blue glow of your alchemic lantern revealed a tunnel leading north."));
  var cavernEntranceDescription = "The mouth of the cave was little more than a slit between two boulders; it lay to the north.";                                                                                                                       
  var brokenPictureFrames = Skald_Object.scenery("broken picture frames")("Someone had purposely destroyed the images contained therein.");
  var brokenBench = Skald_Object.scenery("broken bench")("It listed to one side as two of its legs were missing.");
  var library = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("library"))(Skald_PlaceBuilder.withExit(Skald_Direction.north)("gallery")))(Skald_PlaceBuilder.whenDescribing(function (x) {
      return (function () {
          var $2 = Skald_Place.unvisited(x);
          if ($2) {
              return "You knew better than to hope the Akkonai\u2019s library would be intact, but the scene disheartened you still. ";
          };
          if (!$2) {
              return "";
          };
          throw new Error("Failed pattern match at Example line 207, column 8 - line 209, column 18: " + [ $2.constructor.name ]);
      })() + ("The myriad shelves " + ((function () {
          var $3 = Skald_Place.visited(x);
          if ($3) {
              return "of the once grand library ";
          };
          if (!$3) {
              return "";
          };
          throw new Error("Failed pattern match at Example line 211, column 11 - line 211, column 65: " + [ $3.constructor.name ]);
      })() + "had been thoroughly looted decades ago. An alcove to the east housed  broken bench and the shattered remains of a stained glass window. An archway to the north lead to the gallery; the door it once supported lay beneath it."));
  })))(Skald_PlaceBuilder.containing([ libraryShelves, brokenBench ]));
  var boulders = Skald_Object.scenery("boulders")("Though close, you could squeeze easily between the rocks.");
  var cavernEntrance = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("cavern entrance"))(Skald_PlaceBuilder.withDescription(cavernEntranceDescription)))(Skald_PlaceBuilder.withExit(Skald_Direction.north)("cavern interior")))(Skald_PlaceBuilder.containing([ boulders ]));
  var archway = Skald_Object.scenery("archway")("Chiseled into the arch was \u201chwaptr\xe2\u201d, the Akettan word for library.");
  var gallery = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("gallery"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.west)("southern inner ward courtyard"), Skald_PlaceBuilder.to(Skald_Direction.north)("gallery"), Skald_PlaceBuilder.to(Skald_Direction.south)("library") ])))(Skald_PlaceBuilder.withDescription("The walls were bare, save for a few broken picture frames and a lone intact painting weathered beyond recognition. An archway lead to the south. To the west was the inner ward courtyard.")))(Skald_PlaceBuilder.containing([ galleryWalls, brokenPictureFrames, archway ]));
  var aperture = Skald_Object.scenery("aperture")("You could not make out what was on the other side.");
  var cavernSpring = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Place.place("cavern spring"))(Skald_PlaceBuilder.withExits([ Skald_PlaceBuilder.to(Skald_Direction.south)("cavern interior"), Skald_PlaceBuilder.to(Skald_Direction.west)("well") ])))(Skald_PlaceBuilder.withDescription(cavernSpringDescription)))(Skald_PlaceBuilder.containing([ stalactites, poolOfWater, waterline, aperture ]));
  var main = Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Data_Function.applyFlipped(Skald_Tale.tale("Example Tale"))(Skald_Tale.by("Ian D. Bollinger")))(Skald_Tale.thatBeginsIn(cavernEntrance)))(Skald_Tale.withPlaces([ cavernInterior, cavernSpring, well, northernInnerWardCourtyard, keepApproach, southernInnerWardCourtyard, library, gallery, greatHall, kitchen, larder, gatehouse, outerWardCourtyard ])))(Skald_App.run);
  exports["aperture"] = aperture;
  exports["archway"] = archway;
  exports["boulders"] = boulders;
  exports["brokenBench"] = brokenBench;
  exports["brokenPictureFrames"] = brokenPictureFrames;
  exports["cavernEntrance"] = cavernEntrance;
  exports["cavernEntranceDescription"] = cavernEntranceDescription;
  exports["cavernInterior"] = cavernInterior;
  exports["cavernSpring"] = cavernSpring;
  exports["cavernSpringDescription"] = cavernSpringDescription;
  exports["cobwebs"] = cobwebs;
  exports["corbels"] = corbels;
  exports["dais"] = dais;
  exports["doorway"] = doorway;
  exports["fireplaces"] = fireplaces;
  exports["fog"] = fog;
  exports["gallery"] = gallery;
  exports["galleryWalls"] = galleryWalls;
  exports["gatehouse"] = gatehouse;
  exports["greatHall"] = greatHall;
  exports["hole"] = hole;
  exports["keepApproach"] = keepApproach;
  exports["kitchen"] = kitchen;
  exports["knife"] = knife;
  exports["larder"] = larder;
  exports["larderShelves"] = larderShelves;
  exports["leaves"] = leaves;
  exports["library"] = library;
  exports["libraryShelves"] = libraryShelves;
  exports["main"] = main;
  exports["northernInnerWardCourtyard"] = northernInnerWardCourtyard;
  exports["outerWardCourtyard"] = outerWardCourtyard;
  exports["poolOfWater"] = poolOfWater;
  exports["rodentDroppings"] = rodentDroppings;
  exports["roots"] = roots;
  exports["sacksOfGrain"] = sacksOfGrain;
  exports["southernInnerWardCourtyard"] = southernInnerWardCourtyard;
  exports["spiralStaircase"] = spiralStaircase;
  exports["stalactites"] = stalactites;
  exports["tables"] = tables;
  exports["tirungaTree"] = tirungaTree;
  exports["waterline"] = waterline;
  exports["well"] = well;
})(PS["Example"] = PS["Example"] || {});
(function(exports) {
  // Generated by psc version 0.9.1
  "use strict";
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Skald = PS["Skald"];
  var Example = PS["Example"];        
  var main = Example.main;
  exports["main"] = main;
})(PS["Main"] = PS["Main"] || {});
PS["Main"].main();

},{"virtual-dom/create-element":1,"virtual-dom/diff":2,"virtual-dom/patch":6,"virtual-dom/virtual-hyperscript/hooks/soft-set-hook":13,"virtual-dom/vnode/vnode":21,"virtual-dom/vnode/vtext":23}],27:[function(require,module,exports){

},{}]},{},[26]);

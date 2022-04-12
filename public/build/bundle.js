
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.6' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const users = writable(
        localStorage.users ? JSON.parse(localStorage.getItem("users")) : null
    );

    /* src/Login.svelte generated by Svelte v3.46.6 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/Login.svelte";

    // (81:0) {#if loginResponse.error}
    function create_if_block_1$1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*loginResponse*/ ctx[2].error + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Error ❌ ");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "error");
    			add_location(p, file$2, 81, 4, 2576);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*loginResponse*/ 4 && t1_value !== (t1_value = /*loginResponse*/ ctx[2].error + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(81:0) {#if loginResponse.error}",
    		ctx
    	});

    	return block;
    }

    // (84:0) {#if loginResponse.success}
    function create_if_block$1(ctx) {
    	let p0;
    	let t1;
    	let p1;
    	let t2_value = /*loginResponse*/ ctx[2].userName + "";
    	let t2;
    	let t3;
    	let p2;
    	let t4_value = /*loginResponse*/ ctx[2].email + "";
    	let t4;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "Success ✔";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			p2 = element("p");
    			t4 = text(t4_value);
    			attr_dev(p0, "class", "success");
    			add_location(p0, file$2, 84, 4, 2665);
    			add_location(p1, file$2, 85, 4, 2702);
    			add_location(p2, file$2, 86, 4, 2738);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*loginResponse*/ 4 && t2_value !== (t2_value = /*loginResponse*/ ctx[2].userName + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*loginResponse*/ 4 && t4_value !== (t4_value = /*loginResponse*/ ctx[2].email + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(p2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(84:0) {#if loginResponse.success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let form;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let button;
    	let t7;
    	let t8;
    	let t9;
    	let p;
    	let t10;
    	let strong;
    	let mounted;
    	let dispose;
    	let if_block0 = /*loginResponse*/ ctx[2].error && create_if_block_1$1(ctx);
    	let if_block1 = /*loginResponse*/ ctx[2].success && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			label0 = element("label");
    			label0.textContent = "Username";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			label1 = element("label");
    			label1.textContent = "Password";
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Sign in";
    			t7 = space();
    			if (if_block0) if_block0.c();
    			t8 = space();
    			if (if_block1) if_block1.c();
    			t9 = space();
    			p = element("p");
    			t10 = text("Don't have an account?\n    ");
    			strong = element("strong");
    			strong.textContent = "Sign up";
    			attr_dev(label0, "for", "userName");
    			add_location(label0, file$2, 72, 4, 2283);
    			attr_dev(input0, "id", "userName");
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$2, 73, 4, 2326);
    			attr_dev(label1, "for", "password");
    			add_location(label1, file$2, 74, 4, 2388);
    			attr_dev(input1, "id", "password");
    			attr_dev(input1, "type", "password");
    			add_location(input1, file$2, 75, 4, 2431);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$2, 77, 4, 2498);
    			add_location(form, file$2, 71, 0, 2232);
    			attr_dev(strong, "class", "link");
    			add_location(strong, file$2, 90, 4, 2808);
    			add_location(p, file$2, 88, 0, 2773);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, label0);
    			append_dev(form, t1);
    			append_dev(form, input0);
    			set_input_value(input0, /*userName*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, label1);
    			append_dev(form, t4);
    			append_dev(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t5);
    			append_dev(form, button);
    			insert_dev(target, t7, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t8, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t10);
    			append_dev(p, strong);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]), false, true, false),
    					listen_dev(strong, "click", /*navigateToSignup*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userName*/ 1 && input0.value !== /*userName*/ ctx[0]) {
    				set_input_value(input0, /*userName*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*loginResponse*/ ctx[2].error) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(t8.parentNode, t8);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*loginResponse*/ ctx[2].success) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(t9.parentNode, t9);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (detaching) detach_dev(t7);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t8);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(p);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let userName, password, loading;

    	let loginResponse = {
    		error: null,
    		success: null,
    		profile: null
    	};

    	const handleSubmit = e => {
    		let loginFields = { userName, password };
    		loading = true;

    		$$invalidate(2, loginResponse = {
    			error: null,
    			success: null,
    			profile: null
    		});

    		const apiURL = `http://localhost:8080/api/user/login/${userName}`;

    		fetch(apiURL, {
    			method: "POST",
    			//mode: "no-cors",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(loginFields)
    		}).then(response => response.json()).then(data => {
    			if (data.ErrorCode) {
    				if (data.ErrorCode == 404) {
    					$$invalidate(2, loginResponse = { ...loginResponse, error: data.Message });
    				} else if (data.ErrorCode == 500) {
    					$$invalidate(2, loginResponse = {
    						...loginResponse,
    						error: data.Errors[0].ErrorMessage
    					});
    				} else {
    					$$invalidate(2, loginResponse = {
    						...loginResponse,
    						error: data.Description
    					});
    				}
    			} else {
    				console.log(data);

    				$$invalidate(2, loginResponse = {
    					...loginResponse,
    					success: true,
    					userName: data.userName,
    					email: data.email,
    					profile: data.Profile
    				});

    				users.set(loginResponse);
    				localStorage.setItem("users", JSON.stringify(loginResponse));
    			}
    		}).catch(error => console.log(error)).finally(() => loading = false);
    	};

    	const navigateToSignup = () => {
    		
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		userName = this.value;
    		$$invalidate(0, userName);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({
    		users,
    		userName,
    		password,
    		loading,
    		loginResponse,
    		handleSubmit,
    		navigateToSignup
    	});

    	$$self.$inject_state = $$props => {
    		if ('userName' in $$props) $$invalidate(0, userName = $$props.userName);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('loading' in $$props) loading = $$props.loading;
    		if ('loginResponse' in $$props) $$invalidate(2, loginResponse = $$props.loginResponse);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		userName,
    		password,
    		loginResponse,
    		handleSubmit,
    		navigateToSignup,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/screens/Signup.svelte generated by Svelte v3.46.6 */

    const { console: console_1 } = globals;
    const file$1 = "src/screens/Signup.svelte";

    // (135:4) {#if signupUserResponse.error.already}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*signupUserResponse*/ ctx[8].error.already + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file$1, 135, 8, 4203);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*signupUserResponse*/ 256 && t_value !== (t_value = /*signupUserResponse*/ ctx[8].error.already + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(135:4) {#if signupUserResponse.error.already}",
    		ctx
    	});

    	return block;
    }

    // (153:4) {#if signupUserResponse.success}
    function create_if_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*signupUserResponse*/ ctx[8].success + "";
    	let t1;
    	let t2;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let input2;
    	let t5;
    	let input3;
    	let t6;
    	let input4;
    	let t7;
    	let button;
    	let t9;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*signupProfileResponse*/ ctx[9].success && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Success ✔\n            ");
    			t1 = text(t1_value);
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			input2 = element("input");
    			t5 = space();
    			input3 = element("input");
    			t6 = space();
    			input4 = element("input");
    			t7 = space();
    			button = element("button");
    			button.textContent = "Signup";
    			t9 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(p, "class", "success");
    			add_location(p, file$1, 155, 8, 4781);
    			attr_dev(input0, "class", "form-field");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Display name");
    			add_location(input0, file$1, 159, 8, 4885);
    			attr_dev(input1, "class", "form-field");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "phone");
    			add_location(input1, file$1, 165, 8, 5042);
    			attr_dev(input2, "class", "form-field");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "dob");
    			add_location(input2, file$1, 171, 8, 5186);
    			attr_dev(input3, "class", "form-field");
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "website");
    			add_location(input3, file$1, 177, 8, 5326);
    			attr_dev(input4, "class", "form-field");
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "placeholder", "gender");
    			add_location(input4, file$1, 183, 8, 5474);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "form-field");
    			add_location(button, file$1, 189, 8, 5620);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*displayName*/ ctx[3]);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input1, anchor);
    			set_input_value(input1, /*phone*/ ctx[4]);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, input2, anchor);
    			set_input_value(input2, /*dob*/ ctx[5]);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, input3, anchor);
    			set_input_value(input3, /*website*/ ctx[6]);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, input4, anchor);
    			set_input_value(input4, /*gender*/ ctx[7]);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t9, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[15]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[16]),
    					listen_dev(input2, "input", /*input2_input_handler_1*/ ctx[17]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[18]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[19])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*signupUserResponse*/ 256 && t1_value !== (t1_value = /*signupUserResponse*/ ctx[8].success + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*displayName*/ 8 && input0.value !== /*displayName*/ ctx[3]) {
    				set_input_value(input0, /*displayName*/ ctx[3]);
    			}

    			if (dirty & /*phone*/ 16 && input1.value !== /*phone*/ ctx[4]) {
    				set_input_value(input1, /*phone*/ ctx[4]);
    			}

    			if (dirty & /*dob*/ 32 && input2.value !== /*dob*/ ctx[5]) {
    				set_input_value(input2, /*dob*/ ctx[5]);
    			}

    			if (dirty & /*website*/ 64 && input3.value !== /*website*/ ctx[6]) {
    				set_input_value(input3, /*website*/ ctx[6]);
    			}

    			if (dirty & /*gender*/ 128 && input4.value !== /*gender*/ ctx[7]) {
    				set_input_value(input4, /*gender*/ ctx[7]);
    			}

    			if (/*signupProfileResponse*/ ctx[9].success) {
    				if (if_block) ; else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(input2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input3);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(input4);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t9);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(153:4) {#if signupUserResponse.success}",
    		ctx
    	});

    	return block;
    }

    // (191:8) {#if signupProfileResponse.success}
    function create_if_block_1(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(191:8) {#if signupProfileResponse.success}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let form;
    	let h1;
    	let t1;
    	let h3;
    	let t3;
    	let input0;
    	let t4;
    	let t5;
    	let input1;
    	let t6;
    	let input2;
    	let t7;
    	let button;
    	let t9;
    	let t10;
    	let p;
    	let t11;
    	let strong;
    	let mounted;
    	let dispose;
    	let if_block0 = /*signupUserResponse*/ ctx[8].error.already && create_if_block_2(ctx);
    	let if_block1 = /*signupUserResponse*/ ctx[8].success && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			h1 = element("h1");
    			h1.textContent = "Talk";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Create a New Account";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			input2 = element("input");
    			t7 = space();
    			button = element("button");
    			button.textContent = "Next";
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			p = element("p");
    			t11 = text("Already have an account?\n        ");
    			strong = element("strong");
    			strong.textContent = "Login";
    			add_location(h1, file$1, 126, 4, 3977);
    			add_location(h3, file$1, 127, 4, 3995);
    			attr_dev(input0, "class", "form-field");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "User Name");
    			add_location(input0, file$1, 128, 4, 4029);
    			attr_dev(input1, "class", "form-field");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Email");
    			add_location(input1, file$1, 137, 4, 4259);
    			attr_dev(input2, "class", "form-field");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Password");
    			add_location(input2, file$1, 143, 4, 4379);
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 149, 4, 4505);
    			attr_dev(strong, "class", "link");
    			add_location(strong, file$1, 198, 8, 5913);
    			add_location(p, file$1, 196, 4, 5868);
    			add_location(form, file$1, 125, 0, 3921);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, h1);
    			append_dev(form, t1);
    			append_dev(form, h3);
    			append_dev(form, t3);
    			append_dev(form, input0);
    			set_input_value(input0, /*userName*/ ctx[0]);
    			append_dev(form, t4);
    			if (if_block0) if_block0.m(form, null);
    			append_dev(form, t5);
    			append_dev(form, input1);
    			set_input_value(input1, /*email*/ ctx[1]);
    			append_dev(form, t6);
    			append_dev(form, input2);
    			set_input_value(input2, /*password*/ ctx[2]);
    			append_dev(form, t7);
    			append_dev(form, button);
    			append_dev(form, t9);
    			if (if_block1) if_block1.m(form, null);
    			append_dev(form, t10);
    			append_dev(form, p);
    			append_dev(p, t11);
    			append_dev(p, strong);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[12]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[13]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[14]),
    					listen_dev(button, "click", /*handleSubmitNext*/ ctx[10], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*handleSubmitFinal*/ ctx[11]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userName*/ 1 && input0.value !== /*userName*/ ctx[0]) {
    				set_input_value(input0, /*userName*/ ctx[0]);
    			}

    			if (/*signupUserResponse*/ ctx[8].error.already) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(form, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*email*/ 2 && input1.value !== /*email*/ ctx[1]) {
    				set_input_value(input1, /*email*/ ctx[1]);
    			}

    			if (dirty & /*password*/ 4 && input2.value !== /*password*/ ctx[2]) {
    				set_input_value(input2, /*password*/ ctx[2]);
    			}

    			if (/*signupUserResponse*/ ctx[8].success) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(form, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Signup', slots, []);
    	let userName;
    	let email;
    	let password;
    	let displayName;
    	let phone;
    	let dob;
    	let website;
    	let gender;

    	let signupUserResponse = {
    		success: null,
    		error: { urlNotfound: "", already: "" }
    	};

    	let signupProfileResponse = { success: null, error: null };

    	const handleSubmitNext = async () => {
    		const userFields = { userName, email, password };

    		$$invalidate(8, signupUserResponse = {
    			success: null,
    			error: { urlNotfound: "", already: "" }
    		});

    		const userApiUrl = "http://localhost:8080/api/user/create";

    		await fetch(userApiUrl, {
    			method: "POST",
    			headers: { "Content-Type": "Application/json" },
    			body: JSON.stringify(userFields)
    		}).then(response => {
    			if (response.status === 500) {
    				$$invalidate(8, signupUserResponse.error.already = "UserName or Email already exist", signupUserResponse);
    			} else {
    				return response.json().then(data => {
    					$$invalidate(8, signupUserResponse = {
    						...signupUserResponse,
    						success: "Go ahead.",
    						uuid: data.uuid,
    						userName: data.userName,
    						email: data.email,
    						password: data.password
    					});
    				});
    			}
    		});
    	}; // .catch((error) => console.log(error))
    	// .finally(() => (loading = false));

    	const handleSubmitFinal = () => {
    		const profileFields = {
    			displayName,
    			phone,
    			dob,
    			website,
    			gender,
    			account: { uuid: `${signupUserResponse.uuid}` }
    		};

    		$$invalidate(9, signupProfileResponse = { success: null, error: null });
    		const profileApiUrl = "http://localhost:8080/api/profile/create";

    		fetch(profileApiUrl, {
    			method: "POST",
    			headers: { "Content-Type": "Application/json" },
    			body: JSON.stringify(profileFields)
    		}).then(response => response.json()).then(data => {
    			if (data.ErrorCode) {
    				if (data.ErrorCode == 936) {
    					$$invalidate(9, signupProfileResponse = {
    						...signupProfileResponse,
    						error: data.Message
    					});
    				} else if (data.ErrorCode == 1134) {
    					$$invalidate(9, signupProfileResponse = {
    						...signupProfileResponse,
    						error: data.Errors[0].ErrorMessage
    					});
    				} else {
    					$$invalidate(9, signupProfileResponse = {
    						...signupProfileResponse,
    						error: data.Description
    					});
    				}
    			} else {
    				$$invalidate(9, signupProfileResponse = {
    					...signupProfileResponse,
    					success: "Account created successfully! Please login via the same details.",
    					displayName: data.displayName,
    					phone: data.phone,
    					dob: data.dob,
    					website: data.website,
    					gender: data.gender,
    					registeredDate: data.registeredDate
    				});
    			}
    		}).catch(error => console.log(error));
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Signup> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		userName = this.value;
    		$$invalidate(0, userName);
    	}

    	function input1_input_handler() {
    		email = this.value;
    		$$invalidate(1, email);
    	}

    	function input2_input_handler() {
    		password = this.value;
    		$$invalidate(2, password);
    	}

    	function input0_input_handler_1() {
    		displayName = this.value;
    		$$invalidate(3, displayName);
    	}

    	function input1_input_handler_1() {
    		phone = this.value;
    		$$invalidate(4, phone);
    	}

    	function input2_input_handler_1() {
    		dob = this.value;
    		$$invalidate(5, dob);
    	}

    	function input3_input_handler() {
    		website = this.value;
    		$$invalidate(6, website);
    	}

    	function input4_input_handler() {
    		gender = this.value;
    		$$invalidate(7, gender);
    	}

    	$$self.$capture_state = () => ({
    		userName,
    		email,
    		password,
    		displayName,
    		phone,
    		dob,
    		website,
    		gender,
    		signupUserResponse,
    		signupProfileResponse,
    		handleSubmitNext,
    		handleSubmitFinal
    	});

    	$$self.$inject_state = $$props => {
    		if ('userName' in $$props) $$invalidate(0, userName = $$props.userName);
    		if ('email' in $$props) $$invalidate(1, email = $$props.email);
    		if ('password' in $$props) $$invalidate(2, password = $$props.password);
    		if ('displayName' in $$props) $$invalidate(3, displayName = $$props.displayName);
    		if ('phone' in $$props) $$invalidate(4, phone = $$props.phone);
    		if ('dob' in $$props) $$invalidate(5, dob = $$props.dob);
    		if ('website' in $$props) $$invalidate(6, website = $$props.website);
    		if ('gender' in $$props) $$invalidate(7, gender = $$props.gender);
    		if ('signupUserResponse' in $$props) $$invalidate(8, signupUserResponse = $$props.signupUserResponse);
    		if ('signupProfileResponse' in $$props) $$invalidate(9, signupProfileResponse = $$props.signupProfileResponse);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		userName,
    		email,
    		password,
    		displayName,
    		phone,
    		dob,
    		website,
    		gender,
    		signupUserResponse,
    		signupProfileResponse,
    		handleSubmitNext,
    		handleSubmitFinal,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input0_input_handler_1,
    		input1_input_handler_1,
    		input2_input_handler_1,
    		input3_input_handler,
    		input4_input_handler
    	];
    }

    class Signup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Signup",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.6 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let signup;
    	let current;
    	signup = new Signup({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(signup.$$.fragment);
    			attr_dev(main, "class", "svelte-1rxplrk");
    			add_location(main, file, 25, 0, 566);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(signup, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(signup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(signup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(signup);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Login, Signup });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

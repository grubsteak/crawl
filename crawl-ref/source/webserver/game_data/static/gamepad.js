define(["jquery"],
/*
 * This is very much a game mod and not a real good implementation of gamepad support
 * It is a prototype to demonstrate the unrealized potential of playing DCSS with an
 * game controller.
 *
 * - grubsteak
 * 
 * Controls:
 * Left Thumbstick move & A...Precise Movement (maps to numpad)
 * Right Thumbstick move......Coarse Movment   (maps to numpad)
 * Left Trigger...............Auto Explore
 * Right Trigger..............Auto Attack
 * A..........................Numpad Thumbstick / Precise Movement
 * X..........................Pickup items
 * Y..........................Wait one turn
 * Left thumbstick Button.....Go upstairs
 * Right thumbstick button....Go downstairs
 * Start......................Press Enter
 * Select.....................Go to
 */
function ($) {
    "use strict";
    // constants //

    const THUMBSTICK_KEYMAP = [
                ['1','2','3'],
                ['4','5','6'],
                ['7','8','9']
                ]
    const BUTTON_REFRESH_RATE = 200;


    // style prototypes
    const STYLE_MOD_THEME = {
        'background':'white',
        'text':'monospace',
        'color': 'black',
        'border': '6px',
        'borderStyle': 'double',
        
    }
    const STYLE_CENTER_TEXT = {
        'text-align': 'center'
    }

    // actual styles
    const MenuButtonStyle = Object.assign(Object.assign({
            'display':'block',
            'position':'absolute',
            'right':'0',
            'top':'0',
            'width':'100px',
            'height':'40px',
            'opacity':'0.25'
    }, STYLE_MOD_THEME), STYLE_CENTER_TEXT)

    const MenuStyle = Object.assign(Object.assign({
        'display':'block',
        'position':'absolute',
        'left':'50px',
        'top':'0',
        'width':'calc(100% - 300px)',
        'height':'calc(100% - 200px)',
        'padding-left':'50px',
        'padding-right':'50px',
    }, STYLE_MOD_THEME))

    // state //
    var GAMEPAD_CURSOR = {x:0, y:0} // taken from gamepad polling and used by dungeonRendererHook
    
    // DOM elements //
    var Menu=$('<div><h1 center>Gamepad Settings</h1></div>').css(MenuStyle)
    var MenuButton = $('<div>Controller Help</div>').css(MenuButtonStyle)
                     .on("click", (e)=>{
                        Menu.toggle()
                    })

    // Keybinds / actions

    var actionRegistry = new Map()
    function createAction(name, data) {
        var action = {
            'name': name,
            'key': data.key,
            'type': data.type || 'keypress'
        }
        actionRegistry.set(name, action)
        
        return action
    }
    function fireAction(action) {
        $.event.trigger({ type : action.type, which : action.key })
    }

    const XBOX_BUTTON_NAMES = {
        0: 'A',
        1: 'B',
        2: 'X',
        3: 'Y',
        6: 'left trigger',
        7: 'right trigger',
        8: 'select',
        9: 'start',
        10: 'left thumbstick',
        11: 'right thumbstick',
        12: 'dpad-up',
        13: 'dpad-down',
        14: 'dpad-left',
        15: 'dpad-right',
    }
    
    function keyCode(char) {
        return char.charCodeAt(0)
    }

    function getButton(name) {
        for(let BUTTON in XBOX_BUTTON_NAMES) {
            if(XBOX_BUTTON_NAMES[BUTTON] !== undefined
                && XBOX_BUTTON_NAMES[BUTTON] == name) {
                return BUTTON;
            }
        }
        throw new Error("No button with name `"+name+"'")
    }

    const BINDS = {
        [getButton('X')]: createAction('get items', {key:keyCode('g')}),
        [getButton('Y')]: createAction('wait one turn', {key:keyCode('.')}),
        [getButton('left trigger')]: createAction('auto explore', {key:keyCode('o')}),
        [getButton('right trigger')]: createAction('auto attack', {key:9, type:'keydown'}),
        [getButton('left thumbstick')]: createAction('go upstairs', {key:keyCode('<')}),
        [getButton('right thumbstick')]: createAction('go downstairs', {key:keyCode('>')}),
        [getButton('start')]: createAction('enter', {key:13}),
        [getButton('select')]: createAction('go to', {key:keyCode('G')}),
    }

    const MOVE_BUTTON = getButton('A');

    function moveThumbstick() {
        fireAction({key:keyCode(THUMBSTICK_KEYMAP[-GAMEPAD_CURSOR.y+1][GAMEPAD_CURSOR.x+1]), type:"keypress", name:"thumbstick"})
    }

    $('body').append(MenuButton)
    $('body').append(Menu)
    
    Menu.append([
        "* ---------------------- C O N T R O L S -----------------------",
        "*        Button               Action",
        "* Left Thumbstick move & A...Precise Movement (maps to numpad)",
        "* Right Thumbstick move......Coarse Movment   (maps to numpad)",
        "* Left Trigger...............Auto Explore",
        "* Right Trigger..............Auto Attack",
        "* A..........................Numpad Thumbstick / Precise Movement",
        "* X..........................Pickup items",
        "* Y..........................Wait one turn",
        "* Left thumbstick Button.....Go upstairs",
        "* Right thumbstick button....Go downstairs",
        "* Start......................Press Enter",
        "* Select.....................Go to"
    ].join('<br/>'))


    Menu.hide()

    function gamepadHandler(event, connecting) {
      var controller = event.gamepad;
      var wasPressed = []

      if (connecting) {
        var rightStickTimeout = 0
        var buttonDecay = []
        setInterval(()=>{
            for (controller of navigator.getGamepads()) {
                if(controller) {
                    var gamepadX = controller.axes[0] // gamepad X/Y is direction that the gamepad cursor goes
                    var gamepadY = controller.axes[1] // player presses a to move in direction; left stick is single move, right stick is faster / sloppier movement
                    var rightStick = false;
                    if(Math.abs(gamepadX) < 0.25 && Math.abs(gamepadY) <0.25) { // right stick is idle, switch to left stick
                        gamepadX = controller.axes[2]
                        gamepadY = controller.axes[3]
                        if(Math.abs(gamepadX) > 0.25 || Math.abs(gamepadY) > 0.25) {
                            rightStick = true
                        }
                    }
                   
                    var gamepadCursorX = Math.floor(gamepadX+0.5)
                    var gamepadCursorY = Math.floor(gamepadY+0.5)

                    GAMEPAD_CURSOR.x = gamepadCursorX
                    GAMEPAD_CURSOR.y = gamepadCursorY
                    
                    var pressedThisFrame = []; // button indexes that are rising edge this frame are true (also repeat strokes)
            
                    for(var i=0; i<controller.buttons.length; i++) {
                        pressedThisFrame[i]=controller.buttons[i].pressed && !wasPressed[i];
                        buttonDecay[i]=buttonDecay[i]!==undefined ? buttonDecay[i] : 0 // populate it
                    }
                    for(let [key] of buttonDecay.entries()) {
                        
                        if(controller.buttons[key].pressed && !pressedThisFrame[key]) {
                            buttonDecay[key] = Math.max(0,buttonDecay[key]-5)
                            if(buttonDecay[key] == 0) {
                                pressedThisFrame[key] = true
                                buttonDecay[key] = BUTTON_REFRESH_RATE
                            }
                        } else {
                            buttonDecay[key] = BUTTON_REFRESH_RATE
                        }
                    }
                    
                    if(rightStick) {
                        var rightStickPressing = true

                        gamepadX=(gamepadX-.25)/.75 // map out dead zone
                        gamepadY=(gamepadY-.25)/.75

                        // FIXME: sends middle keymap binding, really shouldn't

                        if(rightStickTimeout > 0) {
                            rightStickPressing = false
                        }
                        rightStickTimeout = Math.max(0,rightStickTimeout - 1)
                        if(rightStickPressing) {
                            // send the keymapping
                            moveThumbstick()
                            // make right stick move character faster/slower based on for far out you drag the stick
                            rightStickTimeout = Math.max((1-(Math.sqrt(gamepadX**2 + gamepadY**2)**2))*150,20)
                        }
                    }
                    
                    for(let button in pressedThisFrame) {
                        console.log(button, wasPressed[button], BINDS, BINDS[button])
                        if(pressedThisFrame[button] && BINDS[button] && buttonDecay[button]>0) {
                            fireAction(BINDS[button])
                        }
                    }
                    if(pressedThisFrame[MOVE_BUTTON]) {
                        moveThumbstick()
                    }

                    // populate wasPressed for next frame to poll against
                    for(var i=0; i<controller.buttons.length; i++) {
                        wasPressed[i]=controller.buttons[i].pressed;
                    }
                }
            }
        },1);
      }
    }
    
    window.addEventListener("gamepadconnected", (e) => gamepadHandler(e, true), false);
    window.addEventListener("gamepaddisconnected", (e) => gamepadHandler(e, false), false);

    function dungeonRendererHook(get_viewcenter, place_cursor) {
        setInterval(function () {
            const viewcenter = get_viewcenter()
            place_cursor(viewcenter.x+GAMEPAD_CURSOR.x, viewcenter.y+GAMEPAD_CURSOR.y);
        }, 100); // bad bad bad bad bad
    }

    return dungeonRendererHook
});

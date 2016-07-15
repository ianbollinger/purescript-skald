-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Action (
    module Skald.Internal,
    enterPlace,
    doNothing,
    say,
    sayError,
    emptyWorld,
    describePlace,
    describeObject,
    removeFromInventory,
    createObject,

    looking, look,
    searching, search,
    going, go,
    taking, take,
    takingInventory, takeInventory,
    dropping, drop,
    waiting, wait
    ) where

import Prelude

import Control.Monad.State as State
import Control.Monad.Writer as Writer
import Data.List (List (..), (:))
import Data.Maybe (Maybe (..))
import Data.Monoid (mempty)

import Skald.Command as Command
import Skald.Command (Command, command)
import Skald.History as History
import Skald.History (History, HistoricalEntry)
import Skald.Internal (Action)
import Skald.Object as Object
import Skald.Object (Object)
import Skald.Place as Place
import Skald.Place (Place)
import Skald.World as World
import Skald.World (World)

defaultMap :: Command.Map
defaultMap =
  -- TODO: split up look and look [object].
    Command.insert looking look
    $ Command.insert searching search
    $ Command.insert going go
    $ Command.insert taking take
    $ Command.insert takingInventory takeInventory
    $ Command.insert dropping drop
    $ Command.insert waiting wait
    $ Command.insert debugging debug Nil

debugging :: Command
debugging = command "debug"

debug :: Command.Handler
debug _ = do
    world <- State.get
    say (World.toString world)

-- TODO: rename or move.
emptyWorld :: World
emptyWorld = World.setCommands defaultMap World.empty

looking :: Command
looking = command "(?:describe|examine|look(?: at)?|l|x|check|watch)(?: (.+))?"

look :: Command.Handler
look args = do
    world <- State.get
    let currentPlace = World.currentPlace world
    case args of
        Nil -> describePlace currentPlace
        name : _ -> case Place.object name currentPlace of
            Just found -> describeObject found
            Nothing -> case World.item name world of
                Just found -> describeObject found
                Nothing -> sayError "You could not see such a thing."

searching :: Command
searching = command "search(?: (.+))?"

search :: Command.Handler
search args = case args of
    Nil -> do
        world <- State.get
        let formatObject names = "You found " <> list names <> " here."
        say (formatObject (Place.objectNames (World.currentPlace world)))
    _ -> say "You found nothing."

-- | Writes the object's description to the history.
describeObject :: Object -> Action Unit
describeObject = say <<< Object.description

going :: Command
going = command "(north(?:east|west)?|east|south(?:east|west)?|west|up|down|[ne\
    \swud]|ne|nw|se|sw)|go(?: to)?(?: (.+))?"

go :: Command.Handler
go args = case args of
    "n" : Nil -> insteadGo "north"
    "ne" : Nil -> insteadGo "northeast"
    "e" : Nil -> insteadGo "east"
    "se" : Nil -> insteadGo "southeast"
    "s" : Nil -> insteadGo "south"
    "sw" : Nil -> insteadGo "southwest"
    "w" : Nil -> insteadGo "west"
    "nw" : Nil -> insteadGo "northwest"
    "u" : Nil -> insteadGo "up"
    "d" : Nil -> insteadGo "down"
    direction : Nil -> do
        world <- State.get
        case Place.exitName direction (World.currentPlace world) of
            Just newPlace -> enterPlace (World.place newPlace world)
            Nothing -> sayError "You could not go that way."
    _ -> sayError "Go where?"
    where
        insteadGo direction = go (direction : Nil)

taking :: Command
taking = command "(?:take|get)(?: (.+))?"

take :: Command.Handler
take args = case args of
    name : Nil -> do
        world <- State.get
        case Place.object name (World.currentPlace world) of
            Just found -> if Object.fixedInPlace found
                then sayError "You could not take that."
                else do
                    addToInventory found
                    destroyObject found
                    say ("You take the " <> name <> ".")
            Nothing -> sayError "You could not see such a thing."
    _ -> sayError "Take what?"

dropping :: Command
dropping = command "drop(?: (.+))?"

drop :: Command.Handler
drop args = case args of
    name : Nil -> do
        world <- State.get
        case World.item name world of
            Just found -> do
                removeFromInventory found
                createObject found
                say ("You drop the " <> name <> ".")
            Nothing -> sayError "You did not have such a thing."
    _ -> sayError "Drop what?"

takingInventory :: Command
takingInventory = command "(?:take )?inventory|i|inv"

takeInventory :: Command.Handler
takeInventory _ = do
    world <- State.get
    let message = if World.inventoryIsEmpty world
            then format "You had nothing."
            else format "You had:"
    Writer.tell (History.cons message (listInventory world))

waiting :: Command
waiting = command "wait|z"

wait :: Command.Handler
wait _ = say "Time passed."

destroyObject :: Object -> Action Unit
destroyObject = State.modify <<< World.removeObject

-- | Inserts an object into the current place.
createObject :: Object -> Action Unit
createObject = State.modify <<< World.addObject

-- | Adds an object to the player's inventory.
addToInventory :: Object -> Action Unit
addToInventory = State.modify <<< World.addToInventory

-- | Removes an object from the player's inventory.
removeFromInventory :: Object -> Action Unit
removeFromInventory = State.modify <<< World.removeFromInventory

-- | An action that does nothing.
doNothing :: World -> Action Unit
doNothing world = pure unit

-- | Writes a string to the history.
say :: String -> Action Unit
say = Writer.tell <<< History.singleton <<< format

-- | Writes a string to the history using the error style.
sayError :: String -> Action Unit
sayError = Writer.tell <<< History.singleton <<< formatError

-- place -----------------------------------------------------------------------

enterPlace :: Place -> Action Unit
enterPlace place = do
    setCurrentPlace place
    describePlace place
    setCurrentPlace (Place.setVisited true place)

setCurrentPlace :: Place -> Action Unit
setCurrentPlace = State.modify <<< World.setCurrentPlace

-- | Writes the place's name and description to the history.
describePlace :: Place -> Action Unit
describePlace place = Writer.tell html
   where
      html = heading (Place.name place)
          `History.cons` (format (Place.description place)
          `History.cons` mempty)

-- TODO: use.
listExits :: Place -> List HistoricalEntry
listExits = map formatExit <<< Place.exitDirections
    where
        formatExit exit =
            format ("From here you could see an exit to the " <> exit <> ".")

-- TODO: display proper article; punctuate list properly.
listInventory :: World -> History
listInventory = History.fromList <<< map (\x -> format ("* a " <> x)) <<< World.inventoryNames

-- html ------------------------------------------------------------------------

list :: List String -> String
list z = case z of
    Nil -> ""
    x : Nil -> x
    x : y : Nil -> x <> ", and " <> y
    x : xs -> x <> ", " <> list xs

format :: String -> HistoricalEntry
format = History.message

formatError :: String -> HistoricalEntry
formatError = History.error

heading :: String -> HistoricalEntry
heading = History.heading

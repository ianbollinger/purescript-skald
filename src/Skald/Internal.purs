-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- | Defines mutally-recursively data types.
module Skald.Internal
  ( Object(..)
  , ObjectCommands
  , Place(..)
  , Exits(..)
  , Objects(..)
  , World(..)
  , Command(..)
  , CommandHandler
  , CommandMap
  , Action
  , Places(..)
  , Inventory(..)
  , History(..)
  , HistoricalEntry(..)
  ) where

import Prelude

import Control.Monad.Writer.Trans (WriterT)
import Control.Monad.State (State)
import Data.Generic (class Generic, gShow)
import Data.List (List (..))
import Data.Map (Map)
import Data.Monoid (class Monoid)
import Data.String.Regex (Regex)
import Data.StrMap (StrMap)
import Data.Tuple (Tuple)
import Skald.Debug (class Debug, debug)
import Skald.Direction (Direction)

data Object = Object
  { name :: String
  , description :: String
  , fixedInPlace :: Boolean
  , commands :: ObjectCommands
  }

instance debugObject :: Debug Object where
  debug (Object { name, description, fixedInPlace, commands }) =
    "Object\n\
    \  { name = " <> debug name <> "\n\
    \  , description = " <> debug description <> "\n\
    \  , fixedInPlace = " <> debug fixedInPlace <> "\n\
    \  , commands = " <> "<?>" <> "\n\
    \  }"

-- TODO: Think of snappier name.
-- TODO: wrap in newtype.
type ObjectCommands = Map Command (Action Unit)

data Place = Place
  { name :: String
  , describer :: Place -> String
  , exits :: Exits
  , objects :: Objects
  , visited :: Boolean
  }

instance debugPlace :: Debug Place where
  debug (Place { name, describer, exits, objects, visited }) =
    "place " <> debug name <> "\n\
    \  # withDescription " <> debug describer <> "\n\
    \  # withExits " <> debug exits <> "\n\
    \  # containing " <> debug objects <> "\n"

newtype Exits = Exits (Map Direction String)

derive instance eqExits :: Eq Exits

instance showExits :: Show Exits where
  show (Exits a) = "Exits (" <> show a <> ")"

instance debugExits :: Debug Exits where
  debug (Exits a) = debug a

newtype Objects = Objects (StrMap Object)

instance debugObjects :: Debug Objects where
  debug (Objects objects) = debug objects

data World = World
  { currentPlaceName :: String
  , places :: Places
  , commands :: CommandMap
  , inventory :: Inventory
  }

instance debugWorld :: Debug World where
  debug (World { currentPlaceName, places, commands, inventory }) =
    "World\n\
    \  { currentPlaceName = " <> debug currentPlaceName <> "\n\
    \  , places = " <> debug places <> "\n\
    \  , commands = " <> "<???>" <> "\n\
    \  , inventory = " <> "<???>" <> "\n\
    \  }"

data Command = Command String Regex

instance eqCommand :: Eq Command where
  eq (Command a _) (Command b _) = eq a b

instance ordCommand :: Ord Command where
  compare (Command a _) (Command b _) = compare a b

instance showCommand :: Show Command where
  show (Command a _) = "command " <> a

type CommandHandler = List String -> Action Unit

-- TODO: wrap in newtype.
type CommandMap = List (Tuple Command CommandHandler)

-- TODO: wrap in newtype.
type Action a = WriterT History (State World) a

newtype History = History (List HistoricalEntry)

derive instance genericHistory :: Generic History

derive instance eqHistory :: Eq History

derive instance ordHistory :: Ord History

instance monoidHistory :: Monoid History where
  mempty = History Nil

instance semigroupHistory :: Semigroup History where
  append (History a) (History b) = History (a <> b)

instance showHistory :: Show History where
  show = gShow

data HistoricalEntry
  = Message String
  | Echo String
  | Heading String
  | Error String
  | Debug String

derive instance genericHistoricalEntry :: Generic HistoricalEntry

derive instance eqHistoricalEntry :: Eq HistoricalEntry

derive instance ordHistoricalEntry:: Ord HistoricalEntry

instance showHistoricalEntry :: Show HistoricalEntry where
  show = gShow

-- TODO: wrap in newtype.
type Places = StrMap Place

newtype Inventory = Inventory (StrMap Object)

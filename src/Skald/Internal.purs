-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

-- | Defines mutally-recursively data types.
module Skald.Internal (
    Object (..),
    ObjectCommands,
    Place (..),
    Exits (..),
    Objects (..),
    World (..),
    Command (..),
    CommandHandler,
    CommandMap,
    Action,
    Places (..),
    Inventory (..),
    History (..),
    HistoricalEntry (..)
    ) where

import Prelude

import Control.Monad.Writer.Trans (WriterT)
import Control.Monad.State (State)
import Data.Generic (class Generic, gCompare, gEq, gShow)
import Data.List (List (..))
import Data.Map (Map)
import Data.Monoid (class Monoid)
import Data.String.Regex (Regex)
import Data.StrMap (StrMap)
import Data.Tuple (Tuple)

data Object = Object {
    name :: String,
    description :: String,
    fixedInPlace :: Boolean,
    commands :: ObjectCommands
    }

-- TODO: Think of snappier name.
-- TODO: wrap in newtype.
type ObjectCommands = Map Command (Action Unit)

data Place = Place {
    name :: String,
    describer :: Place -> String,
    exits :: Exits,
    objects :: Objects,
    visited :: Boolean
    }

newtype Exits = Exits (StrMap String)

instance eqExits :: Eq Exits where
    eq (Exits a) (Exits b) = eq a b

instance showExits :: Show Exits where
    show (Exits a) = "Exits (" <> show a <> ")"

newtype Objects = Objects (StrMap Object)

data World = World {
    currentPlaceName :: String,
    places :: Places,
    commands :: CommandMap,
    inventory :: Inventory
    }

data Command = Command String Regex

instance eqCommand :: Eq Command where
    eq (Command a _) (Command b _) = eq a b

instance ordCommand :: Ord Command where
    compare (Command a _) (Command b _) = compare a b

instance showCommand :: Show Command where
    show (Command a _) = "command " <> a

-- TODO: wrap in newtype.
type CommandHandler = List String -> Action Unit

-- TODO: wrap in newtype.
type CommandMap = List (Tuple Command CommandHandler)

-- TODO: wrap in newtype.
-- TODO: encapsulate World in Action.
type Action a = WriterT History (State World) a

newtype History = History (List HistoricalEntry)

derive instance genericHistory :: Generic History

instance eqHistory :: Eq History where
    eq = gEq

instance ordHistory :: Ord History where
    compare = gCompare

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

derive instance genericHistoricalEntry :: Generic HistoricalEntry

instance eqHistoricalEntry :: Eq HistoricalEntry where
    eq = gEq

instance ordHistoricalEntry:: Ord HistoricalEntry where
    compare = gCompare

instance showHistoricalEntry :: Show HistoricalEntry where
    show = gShow

-- TODO: wrap in newtype.
type Places = StrMap Place

newtype Inventory = Inventory (StrMap Object)

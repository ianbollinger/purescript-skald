-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Object (
    module InternalExports,
    object,
    scenery,
    name,
    description,
    fixedInPlace,
    insteadOf,
    command
    ) where

import Prelude

import Data.Map as Map
import Data.Maybe (Maybe)

import Skald.Internal (Object) as InternalExports
import Skald.Internal (Action, Command, Object (..))

-- | Creates a new object with the given name and description.
object :: String -> String -> Object
object name' description' = Object {
    name: name',
    description: description',
    fixedInPlace: false,
    commands: Map.empty
    }

-- | Creates a new scenery object with the given name and description.
scenery :: String -> String -> Object
scenery name' description' = Object {
    name: name',
    description: description',
    fixedInPlace: true,
    commands: Map.empty
    }

-- | The name of the given object.
name :: Object -> String
name (Object object') = object'.name

-- | The description of the given object.
description :: Object -> String
description (Object object') = object'.description

-- | Whether the given object is fixed-in-place or not.
--
-- Objects that are fixed-in-place include scenery.
fixedInPlace :: Object -> Boolean
fixedInPlace (Object object') = object'.fixedInPlace

-- TODO: add other combinators, i.e. before, after, etc.
insteadOf :: Command -> Action Unit -> Object -> Object
insteadOf command' action (Object object'@{ commands: commands' }) =
    Object (object' { commands = Map.insert command' action commands' })

command :: Command -> Object -> Maybe (Action Unit)
command command' (Object { commands: commands' }) =
    Map.lookup command' commands'

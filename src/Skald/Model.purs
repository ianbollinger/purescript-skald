-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Model (
    Model,
    empty,
    history,
    setHistory,
    appendHistory,
    world,
    setWorld,
    inputField,
    setInputField
    ) where

import Prelude

import Data.Monoid (mempty)

import Skald.Action as Action
import Skald.History (History)
import Skald.World (World)

-- | Contains the entirety of a Skald application's state.
data Model = Model {
    history :: History,
    world :: World,
    inputField :: String
    }

-- | An empty model.
empty :: Model
empty = Model {
    history: mempty,
    world: Action.emptyWorld,
    inputField: ""
    }

-- | The given model's history.
history :: Model -> History
history (Model model) = model.history

-- | Set the given model's history.
setHistory :: History -> Model -> Model
setHistory newHistory (Model model) = Model (model { history = newHistory })

-- | Append the given entries to the model's history.
appendHistory :: History -> Model -> Model
appendHistory entries (Model model) =
    Model (model { history = model.history <> entries })

-- | The world contained in the given model.
world :: Model -> World
world (Model model) = model.world

-- | Sets the world for the given model.
setWorld :: World -> Model -> Model
setWorld newWorld (Model model) = Model (model { world = newWorld })

-- | The contents of the input field contained by the given model.
inputField :: Model -> String
inputField (Model model) = model.inputField

-- | Set the contents of the input field for the given model.
setInputField :: String -> Model -> Model
setInputField newInputField (Model model) =
    Model (model { inputField = newInputField })

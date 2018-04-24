-- Copyright 2018 Ian D. Bollinger
--
-- Licensed under the MIT license <https://spdx.org/licenses/MIT>. This file may
-- not be copied, modified, or distributed except according to those terms.

module Skald.Application
  ( startUp
  , update
  ) where

import Prelude

import Control.Monad.State (runState)
import Control.Monad.Writer.Trans (execWriterT)
import Data.Tuple (Tuple(..))
import Skald.Action (enterPlace)
import Skald.Command as Command
import Skald.History as History
import Skald.Model (Model)
import Skald.Model as Model
import Skald.Tale (Tale, initialWorld)
import Skald.World (currentPlace)

-- | Submits the contents of the input field to the command parser.
update :: String -> Model -> Model
update field model =
  case runState (execWriterT (Command.parse field)) (Model.world model) of
    Tuple commandResult newWorld ->
      Model.setWorld newWorld
      $ Model.appendHistory (History.cons (History.echo field) commandResult)
      $ model

startUp :: Tale -> Model
startUp tale = case runState (execWriterT onStartUp) world of
  Tuple description newWorld ->
    Model.setWorld newWorld
    $ Model.setHistory description
    $ Model.empty
  where
    world = initialWorld tale
    onStartUp = enterPlace (currentPlace world)

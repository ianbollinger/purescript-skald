-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Application (
    Application,
    Effects,
    run
    ) where

import Prelude

import Control.Monad.Aff (Aff)
import Control.Monad.Aff.Free (fromEff)
import Control.Monad.Eff (Eff)
import Control.Monad.State (runState)
import Control.Monad.Writer.Trans (execWriterT)
import Data.Array as Array
import Data.List ((:))
import Data.Tuple as Tuple
import Data.Tuple (Tuple (..))
import Halogen as H
import Halogen.HTML.Events.Indexed as HE
import Halogen.HTML.Indexed as HH
import Halogen.HTML.Properties.Indexed as HP
import Halogen.Util (awaitBody, runHalogenAff)

import Skald.Action as Action
import Skald.Command as Command
import Skald.History as History
import Skald.History (History)
import Skald.Internal (HistoricalEntry (..))
import Skald.Focus (FOCUS, focus)
import Skald.Model as Model
import Skald.Model (Model)
import Skald.Tale as Tale
import Skald.Tale (Tale)
import Skald.World as World

type Application = Eff (Effects ()) Unit

type Effects eff = H.HalogenEffects (focus :: FOCUS | eff)

data Query a
    = UpdateDescription String a
    | Submit String a

-- | Tell the given tale.
run :: Tale -> Application
run tale = runHalogenAff do
    body <- awaitBody
    H.runUI (ui tale) (startUp tale) body

ui :: forall eff. Tale -> H.Component Model Query (Aff (Effects eff))
ui tale = H.component { render, eval }
    where
        render :: Model -> H.ComponentHTML Query
        -- TODO: use better tag than div_.
        render model = HH.div_ ([heading] <> history <> [form])
            where
                heading = HH.h1_ [HH.text (Tale.title tale)]
                history = renderHistory (Model.history model)
                form = HH.form [onSubmit] [input]
                onSubmit =
                    HE.onSubmit (HE.input_ (Submit (Model.inputField model)))
                input = HH.input [
                    HP.inputType HP.InputText,
                    HP.placeholder "Enter command",
                    HP.id_ "input",
                    HE.onValueInput (HE.input UpdateDescription)
                ]

        eval :: Query ~> H.ComponentDSL Model Query (Aff (Effects eff))
        eval query = case query of
            UpdateDescription field next -> do
                H.modify (Model.setInputField field)
                pure next
            Submit field next -> do
                H.modify (update field)
                fromEff focus
                pure next

-- | Renders history to an array of HTML elements.
renderHistory :: forall a. History -> Array (H.ComponentHTML a)
renderHistory =
    Array.fromFoldable <<< map renderHistoricalEntry <<< History.toList

-- | Renders a historical entry to an HTML element.
renderHistoricalEntry :: forall a. HistoricalEntry -> H.ComponentHTML a
renderHistoricalEntry entry =
    HH.p attributes [HH.text (Tuple.snd classAndString)]
    where
        classAndString = case entry of
           Message string -> Tuple "message" string
           Echo string -> Tuple "echo" string
           Heading string -> Tuple "heading" string
           Error string -> Tuple "error" string
        attributes = [HP.class_ (HH.className (Tuple.fst classAndString))]

-- | Submits the contents of the input field to the command parser.
update :: String -> Model -> Model
update field model = case runState (execWriterT (Command.parse field)) (Model.world model) of
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
        world = Tale.initialWorld tale
        onStartUp = Action.enterPlace (World.currentPlace world)

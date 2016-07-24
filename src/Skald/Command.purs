-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald.Command
  ( module InternalExports
  , Handler
  , Map
  , command
  , insert
  , parse
  ) where

import Prelude

import Control.Monad.Eff.Exception.Unsafe (unsafeThrow)
import Control.Monad.State (get)
import Control.Monad.Writer as Writer
import Data.Either (Either (..))
import Data.List as List
import Data.List (List (..), (:))
import Data.Maybe as Maybe
import Data.Maybe (Maybe (..))
import Data.String as String
import Data.String.Regex as Regex
import Data.String.Regex (regex)
import Data.Tuple (Tuple (..))

import Skald.History as History
import Skald.History (HistoricalEntry)
import Skald.Internal (Command) as InternalExports
import Skald.Internal (Action, Command (..), CommandHandler, CommandMap)
import Skald.Object as Object
import Skald.Place as Place
import Skald.World as World

type Handler = CommandHandler

type Map = CommandMap

command :: String -> Command
command string =
    case regex ("^(?:" <> string <> ")$") Regex.noFlags of
        Right regex' -> Command string regex'
        -- TODO: don't do this.
        Left error -> unsafeThrow "invalid regex"

-- | Inserts a command handler into the given command map.
insert :: Command -> Handler -> Map -> Map
insert command' handler map' = Tuple command' handler : map'

-- TODO: decompose this beast.
-- | Parses a command string and returns the corresponding `Action`.
parse :: String -> Action Unit
parse field = do
    world <- get
    -- TODO: this isn't lazy any more! Stop after first match.
    case List.head (List.filter predicate (map matcher (World.commands world))) of
        Just (Tuple command' (Tuple (Just matches) action)) -> do
            let submatches = case List.tail (catMaybes (List.fromFoldable matches)) of
                    Just x -> x
                    -- TODO: this should be impossible.
                    Nothing -> Nil
            -- TODO: this is a dirty hack. We match the object just to throw it
            -- away, which seems fruitless (why not pass it on to the action?)
            -- Furthermore, it assumes every command operates over a single
            -- object as opposed to other things. Commands need an overhaul.
            case submatches of
                x : _ ->
                    case Place.object x (World.currentPlace world) of
                        Just directObject ->
                            case Object.command command' directObject of
                                Just y -> y
                                Nothing -> action submatches
                        Nothing -> action submatches
                Nil ->  action submatches
        _ -> do
            sayParserError "Unrecognized command."
    where
        field' = normalizeWhitespace (String.toLower field)
        matcher (Tuple command'@(Command string regex) action) =
            Tuple command' (Tuple (Regex.match regex field') action)
        predicate (Tuple _ (Tuple x _)) = Maybe.isJust x

normalizeWhitespace :: String -> String
normalizeWhitespace = Regex.replace whitespaceRegex " "
    where
        whitespaceRegex = case regex "\\s+" Regex.noFlags of
            Right regex' -> regex'
            -- NOTE: This cannot occur.
            Left error -> unsafeThrow "normalizeWhitespace failed."

-- TODO: move.
catMaybes :: forall a. List (Maybe a) -> List a
catMaybes = case _ of
    Nil -> Nil
    Nothing : xs -> catMaybes xs
    Just x : xs -> x : catMaybes xs

sayParserError :: String -> Action Unit
sayParserError = Writer.tell <<< History.singleton <<< formatParserError

sayInternalError :: String -> Action Unit
sayInternalError = Writer.tell <<< History.singleton <<< formatInternalError

formatParserError :: String -> HistoricalEntry
formatParserError = History.error

formatInternalError :: String -> HistoricalEntry
formatInternalError = History.error

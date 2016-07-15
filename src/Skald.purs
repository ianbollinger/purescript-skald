-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Skald (
    -- * Applications
    module Skald.Application,

    -- * Tales
    module Skald.Tale,

    -- * Worlds
    module Skald.World,

    -- * Places
    module Skald.Place,
    module Skald.PlaceBuilder,

    -- * Objects
    module Skald.Object,

    -- * Actions
    module Skald.Action,

    -- * Directions
    module Skald.Direction,

    -- * Useful re-exports
    module Prelude,
    module Data.List,
    module Data.Maybe
    ) where

import Prelude (
    class Applicative, pure, liftA1, unless, when,
    class Apply, apply, (*>), (<*), (<*>),
    class Bind, bind, ifM, join, (<=<), (=<<), (>=>), (>>=),
    class Category, id,
    class Monad, ap, liftM1,
    class Semigroupoid, compose, (<<<), (>>>),
    otherwise,
    class BooleanAlgebra,
    class Bounded, bottom, top,
    class CommutativeRing,
    class Eq, eq, notEq, (/=), (==),
    class EuclideanRing, degree, div, mod, (/),
    class Field,
    const, flip, ($), (#),
    class Functor, map, void, ($>), (<#>), (<$), (<$>),
    class HeytingAlgebra, conj, disj, not, (&&), (||),
    type (~>),
    class Ord, compare, (<), (<=), (>), (>=), comparing, min, max, clamp,
    between,
    Ordering (..),
    class Ring, negate, sub, (-),
    class Semigroup, append, (<>),
    class Semiring, add, mul, one, zero, (*), (+),
    class Show, show,
    Unit, unit,
    Void, absurd
    )

import Data.List (List (..), (:))
import Data.Maybe (
    Maybe (..), maybe, maybe', fromMaybe, fromMaybe', isJust, isNothing
    )

import Skald.Action (
    Action, say, sayError, doNothing, describeObject, describePlace,
    removeFromInventory, createObject,

    looking, look,
    searching, search,
    going, go,
    taking, take,
    takingInventory, takeInventory,
    dropping, drop,
    waiting, wait
    )
import Skald.Application (Application, Effects, run)
import Skald.Direction (
    Direction, north, northeast, east, southeast, south, southwest, west,
    northwest, up, down
    )
import Skald.Object (Object, object, scenery, insteadOf)
import Skald.Place (Place, place, visited, unvisited)
import Skald.PlaceBuilder (
    withDescription, whenDescribing, withExit, withExits, to, containing
    )
import Skald.Tale (
    Tale, tale, title, author, initialWorld, preamble, by, withPreamble,
    thatBeginsIn, withPlace, withPlaces, withCommand
    )
import Skald.World (World, inventory, item)

-- Copyright 2018 Ian D. Bollinger
--
-- Licensed under the MIT license <https://spdx.org/licenses/MIT>. This file may
-- not be copied, modified, or distributed except according to those terms.

-- TODO: rename module?
module Skald.Focus
  ( FOCUS
  , focus
  ) where

import Prelude
import Control.Monad.Eff (kind Effect, Eff)

foreign import data FOCUS :: Effect

-- | Sets focus to the input field.
foreign import focus :: forall eff. Eff (focus :: FOCUS | eff) Unit

-- Copyright 2016 Ian D. Bollinger
--
-- Licensed under the MIT license <LICENSE or
-- http://opensource.org/licenses/MIT>. This file may not be copied, modified,
-- or distributed except according to those terms.

module Main where

import Control.Monad.Eff (Eff)

import Skald
import Example as Example

main :: Eff (Effects ()) Unit
main = Example.main

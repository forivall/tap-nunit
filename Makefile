.PHONY: pass fail test

TAP  = ./node_modules/tape/bin/tape
NUNIT = ./bin/tap-nunit

pass:
	@$(TAP) test/pass.js | $(NUNIT)

fail:
	@$(TAP) test/fail.js | $(NUNIT)

test: pass fail

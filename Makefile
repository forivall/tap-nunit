.PHONY: pass fail skip todo test

TAP  = ./node_modules/tape/bin/tape
NUNIT = ./bin/tap-nunit

pass:
	@$(TAP) test/pass.js | $(NUNIT)

fail:
	@$(TAP) test/fail.js | $(NUNIT)

skip:
	@$(TAP) test/skip.js | $(NUNIT)

todo:
	@$(TAP) test/todo.js | $(NUNIT)

test: pass fail skip todo

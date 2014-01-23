
SRC = $(shell find lib -name "*.js" -type f)
UGLIFY_FLAGS = --no-mangle 

all: promised-ejs.min.js

test:
	@./node_modules/.bin/mocha \
		--reporter spec

promised-ejs.js: $(SRC)
	@node support/compile.js $^

promised-ejs.min.js: promised-ejs.js
	@uglifyjs $(UGLIFY_FLAGS) $< > $@ \
		&& du promised-ejs.min.js \
		&& du promised-ejs.js

clean:
	rm -f promised-ejs.js
	rm -f promised-ejs.min.js

.PHONY: test
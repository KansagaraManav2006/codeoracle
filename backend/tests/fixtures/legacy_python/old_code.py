# legacy_python fixture
def process_data(items=[]):
    print "Processing legacy items"
    try:
        val = raw_input("Enter value: ")
        for i in xrange(10):
            print "Index", i
    except:
        eval("1 + 1")

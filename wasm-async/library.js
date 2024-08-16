mergeInto(LibraryManager.library, {
  read_data: (pathptr, bufferptr, sizeptr, errorptr) =>
    read_data_impl(pathptr, bufferptr, sizeptr, errorptr),
});

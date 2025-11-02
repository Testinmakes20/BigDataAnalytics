#!/usr/bin/perl -w
# -*- cperl -*-

use strict;
use Getopt::Long;
use Carp;
use FindBin;
use lib "$FindBin::Bin";

# Local module
use Contents;
#------------------- Arguments ----------------------------
# Provide output listing things that need to be checked for
# making sure the right arguments have been provided to $0
my $evaluate = 0;

# Provide output listing things that are in the system (srcpkgs)
# and in binary (ie things that would be analysed just looking at bin)
my $bin = 0;

# Provide output listing things that are in the system (srcpkgs)
# and with both src and bin
my $sys = 0;

# Provide various 'size' values
my $size = 0;

# Use specified format for output (only does anything for --size at the
# moment - "line" means put everything on one line)
my $format = "";

# List non-public classes
my $np = 0;

# Package prefixes to ignore when doing evaluation.
my @ignorepkg = ();

# List just those jars that contain classes from the system
my $jars = 0;

# The list of all types in the system (ie srcpkgs=0)
my $types = 0;

# Diff contents files
my $diff = "";

# Output details on how to use this script
my $help = 0;

my $testme = 0;
#------------------- Main ---------------------------------

GetOptions(
  'diff=s'       => \$diff,
  'format=s'     => \$format,
  'types'        => \$types,
  'evaluate'     => \$evaluate,
  'bin'          => \$bin,
  'sys'          => \$sys,
  'size'         => \$size,
  'np'           => \$np,
  'jars'         => \$jars,
  'ignorepkg=s'  => \@ignorepkg,
  'testme' => \$testme,
  'help' => \$help,
);
@ignorepkg = split(/,/,join(',',@ignorepkg));


if ($help) {
  usage();
  exit(0);
}

if ($#ARGV < 0) {
  print("\n%%Must provide file with output from find_contents.pl%%\n\n");
  usage();
  exit(1);
}

Contents::read_data($ARGV[0]);

if ($testme) {
  testme();
  exit(0);
}

if ($evaluate) {
  evaluate();
  exit(0);
}
if ($bin) {
  bin();
  exit(0);
}
if ($sys) {
  sys();
  exit(0);
}
if ($size) {
  size($ARGV[1]);
  exit(0);
}
if ($np) {
  np();
  exit(0);
}

if ($jars) {
  jars();
  exit(0);
}

if ($types) {
  get_system_types();
  exit(0);
}

if ($diff ne "") {
  diff($diff);
  exit(0);
}

# default behaviour is to list what's "in" the system
print("# Contents in srcpkgs, both src and bin, and distributed.\n");
print("# sysver: " . Contents::get_sysver() . "\n");
Contents::list(("dist" => "0", "srcpkg" => "0", "consistent" => "0"));

######################################################################
# 
sub diff {
  my($diff_to_file) = @_;

  my @attributes = (
		    "bin",
		    "src",
		    "srcpkg",
		    "consistent",
		    "dist",
		    "top",
		    "loc",
		    "ncloc");

  my %differences = (
		     "differences" => 0,
		     "orig_fqn" => 0,
		     "diff_fqn" => 0,
		     "other" => 0,
		    );
  my $original_ref = Contents::copy();
  Contents::read_data($diff_to_file);
  my $diff_ref = Contents::copy();
  foreach my $fqn (keys %{$original_ref}) {
    if (!defined(${$diff_ref}{$fqn})) {
      printf("$fqn in original but not diff\n");
      $differences{"orig_fqn"}++;
      $differences{"differences"} = 1;
    }
  }
  foreach my $fqn (keys %{$diff_ref}) {
    if (!defined(${$original_ref}{$fqn})) {
      printf("$fqn in diff but not original\n");
      $differences{"diff_fqn"}++;
      $differences{"differences"} = 1;
    }
  }
  foreach my $fqn (keys %{$original_ref}) {
    if (!defined(${$diff_ref}{$fqn})) {
      next;
    }
    my $orig_contents = ${$original_ref}{$fqn};
    my $diff_contents = ${$diff_ref}{$fqn};
    foreach my $attribute (@attributes) {
      if (defined(${$orig_contents}{$attribute})) {
	if (defined(${$diff_contents}{$attribute})) {
	  if (${$orig_contents}{$attribute} ne
	      ${$diff_contents}{$attribute}) {
	    printf("$fqn: different in $attribute - {%s} original, {%s} diff\n",
		   ${$orig_contents}{$attribute},
		   ${$diff_contents}{$attribute});
	    if ($attribute eq "loc" || $attribute eq "ncloc") {
	      printf("\torig src:{%s}\n\t diff src:{%s}\n",
		     ${$orig_contents}{"src"},
		     ${$diff_contents}{"src"});
	    }
	    #	printf("$fqn: src = %s\n", ${$orig_contents}{"src"});
	    #	printf("$fqn: bin = %s\n", ${$orig_contents}{"bin"});
	    $differences{"other"}++;
	    $differences{"differences"} = 1;
	  }
	} else {
	  printf("$fqn: No value for $attribute in diff\n");
	}
      } else {
	printf("$fqn: No value for $attribute in original\n");
      }
    }
  }

  if ($differences{"differences"} == 0) {
    printf("No differences found\n");
  }
}

######################################################################
# The list of all types in the system 
sub get_system_types {
  my $ref = Contents::query_list(("srcpkg" => "0"));
  foreach my $fqn (sort @{$ref}) {
    print("$fqn\n");
  }
}

######################################################################
#
sub jars {
  my %jars = ();
  my $ref = Contents::query_list(("srcpkg" => "0"));

  foreach my $fqn (@{$ref}) {
    my $contentsref = Contents::query_fqn($fqn);
    my $jars = ${$contentsref}{"bin"};
    foreach my $jar (split(",",$jars)) {
      $jars{$jar} = 1;
    }
  }

  foreach my $jar (sort keys %jars) {
    print("$jar\n");
  }
}

######################################################################
# Produce various notions of 'size' for the sysver
sub size {
  my %fqns = ();
  my %top = ();

  # All types in srcpkgs and in both bin and src (distributed or not)
  my $bothref = Contents::query_list(("srcpkg" => "0", "consistent" => "0"));

  foreach my $fqn (@{$bothref}) {
    $fqns{$fqn} = 1;
    if ($fqn !~ m/.+\$.+/) {
      $top{$fqn} = 1;
    }
  }

  # We now know the fqns. Some of them will be nested or non public
  # but there will be no loc/ncloc values for them.
  my %files = ();
  my $loc = 0;
  my $ncloc = 0;
  foreach my $fqn (sort keys %fqns) {
    my $contentsref = Contents::query_fqn($fqn);

    my $file = ${$contentsref}{"src"};
    if (!defined($file) || $file eq "") {
      carp("src for $fqn is empty!\n");
    }
    $files{$file} = 1;

    $loc += ${$contentsref}{"loc"};
    $ncloc += ${$contentsref}{"ncloc"};
#    printf("%s\t%s\n", $file, ${$contentsref}{"loc"});
  }

  my $both = scalar(keys %fqns);

  my $binref = Contents::query_list(("srcpkg" => "0", "consistent" => "1"));
  foreach my $fqn (@{$binref}) {
    $fqns{$fqn} = 1;
    if ($fqn !~ m/.+\$.+/) {
      $top{$fqn} = 1;
    }
  }

  if ($format eq "line") {
    printf("%s\tLOC(Both):%s\tNCLOC(Both):%s\t#Both:%d\t#Bin:%d\t#Top(Bin):%d\t#Files:%d\n", 
	   Contents::get_sysver(), $loc, $ncloc, $both, scalar(keys %fqns),
	   scalar(keys %top), scalar(keys %files));
  } else {
    # Default
    printf("# OUTPUT FROM list_contents.pl\nsysver = %s\nloc(both) = %d\nncloc(both) = %d\nn_both = %d\nn_bin = %d\nn_top(bin) = %d\nn_files = %d\n",
	   Contents::get_sysver(), $loc, $ncloc, $both, scalar(keys %fqns),
	   scalar(keys %top), scalar(keys %files));
  }

}

######################################################################
# List information for those types that are in bin and in srcpkgs
#
sub bin {
  print("#Contents in srcpkgs and in bin\n");
  print("#BOTH\n");
  Contents::list(("srcpkg" => "0", "consistent" => "0")); # both
  print("#BIN ONLY\n");
  Contents::list(("srcpkg" => "0", "consistent" => "1")); # bin only
}

######################################################################
# List information for non-public types
#
sub np {
  print("#Non public classes\n");
  Contents::list(("top" => "1"));
}

######################################################################
# List those things that are in both src and bin that are also in the
# system (srcpkgs), whether distributed or not.
#
sub sys {
  print("#Contents in srcpkgs and both src and bin (whether distributed or not)\n");
  Contents::list(("srcpkg" => "0", "consistent" => "0")); # both
}

######################################################################
# Do some analysis of the output from list_contents.pl, checking what's
# in various categories that might indicate problems with what original
# processing.
#
# srcpkg     0=in src pkg (user-defined), 1=not in src pkg.
# consistent 0=both bin and src, 1=bin only, 2=src only
# dist       0=distributed, 1 = not distributed.
#
sub evaluate {
  # What's in the command line overrides what's in the file
  if ($#ignorepkg < 0) {
    @ignorepkg = Contents::get_ignorepkg();
  }

  print("-----------------------------------------------------------\n");
  print("0. Things listed as in srcpkgs and have both bin and src, but\n");
  print("   also listed as ignored. Possible problem with ignore.\n");
  if ($#ignorepkg >= 0) {
    printf("(Ignoring [%s])\n", join(",",@ignorepkg));
  }
  Contents::list_ignored(("srcpkg" => "0", "consistent" => "0",
			  "ignore" => \@ignorepkg));

  print("-----------------------------------------------------------\n");
  print("1. Things listed as not in system (srcpkgs) but are in both\n");
  print("src and bin. Possible problem with srcpkgs.\n");
  if ($#ignorepkg >= 0) {
    printf("(Ignoring [%s])\n", join(",",@ignorepkg));
  }
  Contents::list(("srcpkg" => "1", "consistent" => "0",
		  "ignore" => \@ignorepkg));

  print("-----------------------------------------------------------\n");
  print("2. Things listed as not in system (srcpkgs) but are in bin and\n");
  print("are distributed.\n");
  print("Possible problem with srcpkgs, but need to determine where source\n");
  print("is\n");
  if ($#ignorepkg >= 0) {
    printf("(Ignoring [%s])\n", join(",",@ignorepkg));
  }
  Contents::list(("srcpkg" => "1", "consistent" => "1", "dist" => "0",
		 "ignore" => \@ignorepkg));

  print("-----------------------------------------------------------\n");
  print("3. Things listed as being in both bin and src but not distributed.\n");
  if ($#ignorepkg >= 0) {
    printf("(Ignoring [%s])\n", join(",",@ignorepkg));
  }
  Contents::list(("consistent" => "0", "dist" => "1",
		 "ignore" => \@ignorepkg));

  print("-----------------------------------------------------------\n");
  print("4. Things listed being in the system, distributed, but not in bin.\n");
  print("Possible problem with distro specs - more things listed than\n");
  print("needed.\n");
  if ($#ignorepkg >= 0) {
    printf("(Ignoring [%s])\n", join(",",@ignorepkg));
  }
  Contents::list(("srcpkg" => 0, "consistent" => "2", "dist" => "0",
		 "ignore" => \@ignorepkg));

  print("-----------------------------------------------------------\n");
  print("5. Things in system listed as not distributed, but in bin only.\n");
  print("Some of these will be non public classes.\n");
  if ($#ignorepkg >= 0) {
    printf("(Ignoring [%s])\n", join(",",@ignorepkg));
  }
  Contents::list(("srcpkg" => "0", "consistent" => "1", "dist" => "1",
		 "ignore" => \@ignorepkg));
}

######################################################################
#
sub testme {
  Contents::list(("srcpkg" => "0", "consistent" => "2",
		 "ignore" => \@ignorepkg));
}

#######################################################################
sub usage {
  print(
    <<EOT
Usage: $0 [--bin | --sys| --size| --np| --evaluate] <path>
       $0 --help

Summarise the contents of a sysver in various ways, using the output from
find_contents.pl.

The default behaviour is to list all types that are in the system (match
srcpkgs), have both source and compiled forms, and are considered to be
distributed (see find_contents.pl for more information on what this means).

Arguments:-
  <path>        - A path to a file containing the output from 
                  find_contents.pl.
  --bin         - List those types in the system and in bin
  --sys         - List those types in the system and both bin and src
                  (but do not need to be distributed, unlike the default
                  behaviour).
  --size        - Provide various sysver size summaries - LOC+, NCLOC+,
                  number of system types in both src and bin, number of
                  system types in bin, number of top-level types in bin,
                  number of files with source.
                  (+ This information may not always be available.)
  --np          - List non-public top level types
  --types       - List all types in the system (union of sys and bin)
  --evaluate    - List things that need to be checked for making sure the
                  right arguments have been provided to find_contents.pl
  --ignorepkg=s - Comma separated list of package prefixes to ignore in
                  various parts of the evaluation (because they have been
                  determined to be not part of the system). This overrides
                  what is in the "#Ignore Packages:" line in the contents
                  file. These should be as specific as possible.
  --jars        - List those jar files in bin that contains .class files for
                  types in the system.
  --diff=s      - Report the difference between the contents file at <path>
                  and the one specified with this flag
  OTHER
  --help        - this message.

EOT
       );
}

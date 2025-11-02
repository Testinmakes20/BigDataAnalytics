# -*- cperl -*-

# Provides support for reading the processing the output of
# list_contents.pl

package Contents;

use strict;
use Exporter;
use Carp;

use vars qw($VERSION @ISA @EXPORT);

$VERSION = 1.0;
@ISA = qw( Exporter );
@EXPORT = qw();

#------------------- Exported Gobals ---------------------------------

# map: fqn => map: type attribute => value
# type attribute \in "bin", "src", "srcpkg", "consistent", "dist",
#                    "loc", "ncloc"
my %content_data = ();

my $sysver = "";
my $srcpkgs = "";
my @distro = ();
my @srcroots = ();
my @ignorepkg = ();

#------------------- Gobals ---------------------------------

sub get_srcroots {
  return @srcroots;
}

sub get_sysver {
  return $sysver;
}

sub get_ignorepkg {
  return @ignorepkg;
}

#######################################################################
#
sub init {
  %content_data = ();
  $sysver = undef;
  $srcpkgs = undef;
  @distro = ();
  @srcroots = ();
}

#######################################################################
# Because of my assumption I'd only ever see one contents file at a time
# I need to provide this (in the short term) to support diffs
# I don't know if I really have to do this but I really need completely
# separate copies.
sub copy {
  my %copy = ();
  foreach my $fqn (keys %content_data) {
    my $orig_ref = $content_data{$fqn};
    my %entry_copy = ();
    foreach my $attribute (keys %{$orig_ref}) {
      $entry_copy{$attribute} = ${$orig_ref}{$attribute};
    }
    $copy{$fqn} = \%entry_copy;
  }
  return \%copy;
}

#######################################################################
# Read the input file (assumed to be the output from list_contents.pl)
# into %content_data
sub read_data {
  my($datafile) = @_;

  open(DATAFILE, $datafile) || die "can't open $datafile: $!";
  while(<DATAFILE>) {
    chomp;
    if (m/^#/) {
      if (m/^#System Version : (.*)$/) {
	$sysver = $1;
      }
      if (m/^#Source Packages: (.*)$/) {
	$srcpkgs = $1;
      }
      if (m/^#Distributed    : (.*)$/) {
	@distro = split(",",$1);
      }
      if (m/^#Source Roots   : (.*)$/) {
	@srcroots = split(",",$1);
      }
      if (m/^#Ignore Packages: (.*)$/) {
	@ignorepkg = split(",",$1);
      }
      next;
    }
    if ($_ eq "") {
      next;
    }
    my @fields = split(/\t/);
    my %contents = (
      "bin" => $fields[1],
      "src" => $fields[2],
      "srcpkg" => $fields[3],
      "consistent" => $fields[4],
      "dist" => $fields[5],
      "top" => $fields[6],
      "loc" => $fields[7],
      "ncloc" => $fields[8],
      );
    $content_data{$fields[0]} = \%contents;
  }
}

#######################################################################
#
sub query_fqn {
  my($fqn) = @_;
  my %contents = %{$content_data{$fqn}};
  return \%contents;
}

#######################################################################
# Return a list of fqns that match the filters given.
#
sub query_list {
  my(%filters) = @_;
  my @result = ();
  my @fqns = sort keys %content_data;
  foreach my $fqn (@fqns) {
    my %contents = %{$content_data{$fqn}};
    if (!defined($contents{"srcpkg"})) {
      die "No contents information for FQN {$fqn} in System {$sysver}\n";
    }

    # If there is a filter for this field but it doesn't match then skip
    if (defined($filters{"srcpkg"}) &&
	$filters{"srcpkg"} ne $contents{"srcpkg"}) {
      next;
    }
    if (defined($filters{"consistent"}) &&
	$filters{"consistent"} ne $contents{"consistent"}) {
      next;
    }
    if (defined($filters{"dist"}) &&
	$filters{"dist"} ne $contents{"dist"}) {
      next;
    }
    if (defined($filters{"top"}) &&
	$filters{"top"} ne $contents{"top"}) {
      next;
    }
    push(@result, $fqn);
  }
  return \@result;
}
#######################################################################
# $ignore_ref - ref to a list of package prefixes to ignore
#
sub list {
  my(%filters) = @_;
  my $entries_ref = query_list(%filters);
  my $count = 0;
  print("# 1. FQN\n");
  print("# 2. Sys - Is in a system source package\n");
  print("# 3. Form - Only source, only binary, or both\n");
  print("# 4. Dist - Is a distributed type\n");
  print("# 5. Top - 0 = yes, 1 = no\n");
  print("# 6. LOC - physical lines of code\n");
  print("# 7. NCLOC - non-comment non-blank lines of code\n");
  print("# FQN	Sys	Form	Dist	Top	LOC	NCLOC\n");
  foreach my $fqn (@{$entries_ref}) {
    if (check_ignore($fqn,$filters{"ignore"})) {
      next;
    }
    my %contents = %{$content_data{$fqn}};
    my $srcpkg = "SYS";
    if ($contents{"srcpkg"} ne "0") {
      $srcpkg = "NONSYS";
    }
    my $consistent = "BOTH";
    if ($contents{"consistent"} eq "1") {
      $consistent = "BIN";
    } elsif ($contents{"consistent"} eq "2") {
      $consistent = "SRC";
    }
    my $dist = "DIST";
    if ($contents{"dist"} ne "0") {
      $dist = "NOTDIST";
    }
    printf("%s\t%s\t%s\t%s\t%d\t%d\t%d\n", $fqn, $srcpkg, $consistent, $dist,
	   $contents{"top"}, $contents{"loc"}, $contents{"ncloc"});
    $count++;
  }
  printf("# %d Entries\n",$count);
}

#######################################################################
# List those types that are being ignored, are in srcpkgs, and we
# have both source and bin.
#
sub list_ignored {
  my(%filters) = @_;
  my $entries_ref = query_list(%filters);
  foreach my $fqn (@{$entries_ref}) {
    my %contents = %{$content_data{$fqn}};
    # Ignore those not in srcpkg
    if ($contents{"srcpkg"} ne "0") {
      next;
    }
    # Ignore those with one of bin or src missing
    if ($contents{"consistent"} ne "0") {
      next;
    }

    if (check_ignore($fqn,$filters{"ignore"})) {
      printf("%s\n", $fqn);
    }
  }
}

########################################################################
# Return true iff one of the ignore_ref strings is a prefix of the
# parameter.
sub check_ignore {
  my($entry,$ignore_ref) = @_;
  if (!defined($ignore_ref)) {
    return 0; # Ignore nothing
  }
#  printf(STDERR "Got [%s] to ignore\n", join(",",@{$ignore_ref}));
  foreach my $ignore (@{$ignore_ref}) {
    if ($entry =~ m/^$ignore/) {
      return 1;
    }
  }
  return 0;
}

#######################################################################
#
sub oldlist {
  my(%filters) = @_;
  my @fqns = sort keys %content_data;
  foreach my $fqn (@fqns) {
    my %contents = %{$content_data{$fqn}};
    if (!defined($contents{"srcpkg"})) {
      die "No contents information for $fqn\n";
    }

    # If there is a filter for this field but it doesn't match then skip
    if (defined($filters{"srcpkg"}) &&
	$filters{"srcpkg"} ne $contents{"srcpkg"}) {
      next;
    }
    if (defined($filters{"consistent"}) &&
	$filters{"consistent"} ne $contents{"consistent"}) {
      next;
    }
    if (defined($filters{"dist"}) &&
	$filters{"dist"} ne $contents{"dist"}) {
      next;
    }
    if (defined($filters{"top"}) &&
	$filters{"top"} ne $contents{"top"}) {
      next;
    }

    my $srcpkg = "SYS";
    if ($contents{"srcpkg"} ne "0") {
      $srcpkg = "NONSYS";
    }
    my $consistent = "BOTH";
    if ($contents{"consistent"} eq "1") {
      $consistent = "BIN";
    } elsif ($contents{"consistent"} eq "2") {
      $consistent = "SRC";
    }
    my $dist = "DIST";
    if ($contents{"dist"} ne "0") {
      $dist = "NOTDIST";
    }
    printf("%s\t%s\t%s\t%s\t%d\t%d\t%d\n", $fqn, $srcpkg, $consistent, $dist,
	   $contents{"top"}, $contents{"loc"}, $contents{"ncloc"});
  }
}

#######################################################################
# Output all data to stdout. Primarily used as for testing
sub dump_data {
  my @fqns = sort keys %content_data;
  foreach my $fqn (@fqns) {
    my %contents = %{$content_data{$fqn}};
    my $sep = "";
    my $bits = "";
    if ($contents{"srcpkg"} eq "0") {
      $bits = "System type";
      $sep = ", ";
    }
    if ($contents{"dist"} eq "0") {
      $bits .= $sep . "Distributed";
      $sep = ", ";
    }
    if ($contents{"consistent"} eq "0") {
      $bits .= $sep . "Both src & bin";
    } elsif ($contents{"consistent"} eq "1") {
      $bits .= $sep . "Bin only";
    } elsif ($contents{"consistent"} eq "2") {
      $bits .= $sep . "Src only";
    } else {
      $bits .= "INCONSISTENT";
    }
    if ($bits ne "") {
      $bits = "\t$bits\n";
    }
    printf("%s\n%s\tbin:%s\n\tsrc:%s\n",
	   $fqn, $bits, $contents{"bin"}, $contents{"src"});
  }
}

####################################################################
# Module initialisation

BEGIN {
}

####################################################################
# This has to be here
1;
####################################################################

